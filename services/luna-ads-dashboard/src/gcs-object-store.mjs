import { randomBytes } from "node:crypto";
import { GoogleAuth } from "google-auth-library";
import { ObjectIntegrityError } from "./errors.mjs";
import { objectNameFor, sha256 } from "./security.mjs";

function isPreconditionFailure(error) {
  return error?.code === 412 || error?.response?.status === 412;
}

function isNotFound(error) {
  return error?.code === 404 || error?.response?.status === 404;
}

function objectGeneration(value) {
  const generation = String(value || "");
  if (!/^[1-9][0-9]{0,19}$/.test(generation)) {
    throw new ObjectIntegrityError();
  }
  return generation;
}

export class GcsObjectStore {
  constructor({
    bucketName,
    objectPrefix,
    auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/devstorage.read_write"],
    }),
  }) {
    this.bucketName = bucketName;
    this.objectPrefix = objectPrefix;
    this.auth = auth;
  }

  uploadUrl() {
    return `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucketName)}/o`;
  }

  downloadUrl(objectName) {
    return (
      `https://storage.googleapis.com/download/storage/v1/b/` +
      `${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(objectName)}`
    );
  }

  metadataUrl(objectName) {
    return (
      `https://storage.googleapis.com/storage/v1/b/` +
      `${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(objectName)}`
    );
  }

  multipartBody(objectName, digest, bytes, boundary) {
    const metadata = Buffer.from(
      JSON.stringify({
        name: objectName,
        contentType: "text/html; charset=utf-8",
        cacheControl: "private, no-store, max-age=0",
        metadata: { lunaSha256: digest },
      }),
    );
    return Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      ),
      metadata,
      Buffer.from(
        `\r\n--${boundary}\r\n` +
          "Content-Type: text/html; charset=utf-8\r\n\r\n",
      ),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
  }

  async putImmutable({ artifactId, digest, bytes }) {
    const objectName = objectNameFor(this.objectPrefix, artifactId, digest);
    const boundary = `luna-${randomBytes(12).toString("hex")}`;
    let generation;
    try {
      const response = await this.auth.request({
        url: this.uploadUrl(),
        method: "POST",
        params: {
          uploadType: "multipart",
          ifGenerationMatch: "0",
        },
        headers: {
          "content-type": `multipart/related; boundary=${boundary}`,
        },
        data: this.multipartBody(objectName, digest, bytes, boundary),
        responseType: "json",
      });
      generation = objectGeneration(response.data?.generation);
    } catch (error) {
      if (!isPreconditionFailure(error)) throw error;
      generation = await this.readCurrentGeneration(objectName);
    }

    const verified = await this.readVerified({
      objectName,
      objectGeneration: generation,
      digest,
      byteLength: bytes.length,
    });
    if (!verified.equals(bytes)) {
      throw new ObjectIntegrityError();
    }
    return {
      objectName,
      objectGeneration: generation,
    };
  }

  async readCurrentGeneration(objectName) {
    let response;
    try {
      response = await this.auth.request({
        url: this.metadataUrl(objectName),
        method: "GET",
        params: { fields: "generation" },
        responseType: "json",
      });
    } catch (error) {
      if (isNotFound(error)) throw new ObjectIntegrityError({ cause: error });
      throw error;
    }
    return objectGeneration(response.data?.generation);
  }

  async readVerified({
    objectName,
    objectGeneration: generation,
    digest,
    byteLength,
  }) {
    const expectedGeneration = objectGeneration(generation);
    let response;
    try {
      response = await this.auth.request({
        url: this.downloadUrl(objectName),
        method: "GET",
        params: { alt: "media", generation: expectedGeneration },
        responseType: "arraybuffer",
      });
    } catch (error) {
      if (isNotFound(error)) throw new ObjectIntegrityError({ cause: error });
      throw error;
    }
    const bytes = Buffer.from(response.data);
    if (bytes.length !== Number(byteLength) || sha256(bytes) !== digest) {
      throw new ObjectIntegrityError();
    }
    return bytes;
  }
}

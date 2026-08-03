import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectIntegrityError } from "../src/errors.mjs";
import { GcsObjectStore } from "../src/gcs-object-store.mjs";
import { sha256 } from "../src/security.mjs";

class FakeAuth {
  constructor() {
    this.bytes = null;
    this.generation = "1001";
    this.requests = [];
    this.rejectCreate = false;
  }

  async request(options) {
    this.requests.push(options);
    if (options.method === "POST") {
      if (this.rejectCreate) {
        const error = new Error("precondition failed");
        error.response = { status: 412 };
        throw error;
      }
      const boundary = /boundary=([^\s]+)/.exec(
        options.headers["content-type"],
      )[1];
      const marker = Buffer.from(
        `\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n`,
      );
      const end = Buffer.from(`\r\n--${boundary}--\r\n`);
      const startIndex = options.data.indexOf(marker);
      const endIndex = options.data.lastIndexOf(end);
      this.bytes = Buffer.from(
        options.data.subarray(startIndex + marker.length, endIndex),
      );
      return { data: { generation: this.generation } };
    }
    if (options.url.includes("/download/")) {
      if (options.params.generation !== this.generation) {
        const error = new Error("generation not found");
        error.response = { status: 404 };
        throw error;
      }
      return { data: Buffer.from(this.bytes) };
    }
    return { data: { generation: this.generation } };
  }
}

test("creates an immutable GCS object and verifies it after upload", async () => {
  const auth = new FakeAuth();
  const store = new GcsObjectStore({
    bucketName: "private-bucket",
    objectPrefix: "dashboards",
    auth,
  });
  const bytes = Buffer.from("<!doctype html><html>immutable</html>");
  const digest = sha256(bytes);

  const stored = await store.putImmutable({
    artifactId: "artifact-1",
    digest,
    bytes,
  });

  const upload = auth.requests[0];
  const download = auth.requests[1];
  assert.match(upload.url, /private-bucket/);
  assert.equal(upload.params.ifGenerationMatch, "0");
  assert.equal(upload.params.uploadType, "multipart");
  assert.match(upload.headers["content-type"], /^multipart\/related/);
  assert(
    upload.data.includes(Buffer.from('"cacheControl":"private, no-store')),
  );
  assert(upload.data.includes(Buffer.from(`"lunaSha256":"${digest}"`)));
  assert.match(download.url, /private-bucket/);
  assert.match(download.url, new RegExp(encodeURIComponent(stored.objectName)));
  assert.equal(download.params.generation, "1001");
  assert.equal(stored.objectGeneration, "1001");
  assert.equal(stored.objectName.includes("artifact-1"), false);
});

test("accepts only a byte-identical object after create precondition failure", async () => {
  const bytes = Buffer.from("<!doctype html><html>existing</html>");
  const auth = new FakeAuth();
  auth.bytes = Buffer.from(bytes);
  auth.rejectCreate = true;
  const store = new GcsObjectStore({
    bucketName: "private-bucket",
    objectPrefix: "dashboards",
    auth,
  });

  await assert.doesNotReject(() =>
    store.putImmutable({
      artifactId: "artifact-existing",
      digest: sha256(bytes),
      bytes,
    }),
  );
  assert.equal(auth.requests[1].params.fields, "generation");
  assert.equal(auth.requests[2].params.generation, "1001");

  auth.bytes = Buffer.from("different");
  await assert.rejects(
    () =>
      store.putImmutable({
        artifactId: "artifact-existing",
        digest: sha256(bytes),
        bytes,
      }),
    ObjectIntegrityError,
  );
});

test("refuses a same-name object recreated under a different GCS generation", async () => {
  const auth = new FakeAuth();
  const store = new GcsObjectStore({
    bucketName: "private-bucket",
    objectPrefix: "dashboards",
    auth,
  });
  const bytes = Buffer.from("<!doctype html><html>generation</html>");
  const digest = sha256(bytes);
  const stored = await store.putImmutable({
    artifactId: "artifact-generation",
    digest,
    bytes,
  });

  auth.generation = "1002";
  auth.bytes = Buffer.from(bytes);
  await assert.rejects(
    () =>
      store.readVerified({
        objectName: stored.objectName,
        objectGeneration: stored.objectGeneration,
        digest,
        byteLength: bytes.length,
      }),
    ObjectIntegrityError,
  );
});

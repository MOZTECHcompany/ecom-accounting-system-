import { createHash, randomBytes } from "node:crypto";
import { AppError } from "./errors.mjs";

const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PUBLIC_ID = /^[A-Za-z0-9_-]{32,96}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function newPublicId() {
  return randomBytes(32).toString("base64url");
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Text(value) {
  return sha256(Buffer.from(value, "utf8"));
}

export function requireArtifactId(value) {
  const artifactId = `${value || ""}`.trim();
  if (!ARTIFACT_ID.test(artifactId)) {
    throw new AppError(400, "invalid_artifact_id", "Artifact id is invalid.");
  }
  return artifactId;
}

export function requirePublicId(value) {
  const publicId = `${value || ""}`.trim();
  if (!PUBLIC_ID.test(publicId)) {
    throw new AppError(404, "not_found", "Not found.");
  }
  return publicId;
}

export function requireSha256(value) {
  const digest = `${value || ""}`.trim().toLowerCase();
  if (!SHA256.test(digest)) {
    throw new AppError(400, "invalid_sha256", "SHA-256 header is invalid.");
  }
  return digest;
}

export function objectNameFor(prefix, artifactId, digest) {
  const artifactKey = sha256Text(artifactId);
  return `${prefix}/${artifactKey.slice(0, 2)}/${artifactKey}/${digest}.html`;
}

export function parseExpiry(value, now, config) {
  if (!value) {
    return new Date(now.getTime() + config.defaultTtlSeconds * 1000);
  }
  const timestamp = Date.parse(`${value}`);
  if (!Number.isFinite(timestamp)) {
    throw new AppError(400, "invalid_expiry", "Expiry timestamp is invalid.");
  }
  const expiresAt = new Date(timestamp);
  const lifetimeSeconds = Math.floor(
    (expiresAt.getTime() - now.getTime()) / 1000,
  );
  if (lifetimeSeconds < 300 || lifetimeSeconds > config.maxTtlSeconds) {
    throw new AppError(
      400,
      "invalid_expiry",
      "Expiry must be in the allowed publication window.",
    );
  }
  return expiresAt;
}

export function publicationState(publication, now) {
  if (publication.revokedAt) return "revoked";
  if (publication.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

export async function readBody(request, maxBytes) {
  const contentLength = Number(request.headers["content-length"]);
  if (
    Number.isFinite(contentLength) &&
    (contentLength < 0 || contentLength > maxBytes)
  ) {
    throw new AppError(413, "artifact_too_large", "Artifact is too large.");
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > maxBytes) {
      throw new AppError(413, "artifact_too_large", "Artifact is too large.");
    }
    chunks.push(bytes);
  }
  if (length === 0) {
    throw new AppError(400, "empty_artifact", "Artifact body is empty.");
  }
  return Buffer.concat(chunks, length);
}

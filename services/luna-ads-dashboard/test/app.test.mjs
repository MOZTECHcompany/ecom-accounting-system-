import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { afterEach, test } from "node:test";
import { createDashboardApp } from "../src/app.mjs";
import {
  AppError,
  ObjectIntegrityError,
  PublicIdCollisionError,
} from "../src/errors.mjs";
import { objectNameFor } from "../src/security.mjs";

const PUBLIC_ID_A = "A".repeat(43);
const PUBLIC_ID_B = "B".repeat(43);
const PUBLIC_ORIGIN = "https://ads.corely.cc";
const ACTOR = "luna-openclaw@example.iam.gserviceaccount.com";
const SOURCE_DIGEST = "c".repeat(64);
const PLATFORM_COVERAGE = Object.freeze({
  requestedPlatform: "all",
  status: "ready",
  sources: [
    {
      name: "meta",
      status: "ready",
      rowCount: 7,
      comparisonCount: 7,
      accountCount: 2,
      mappedAccountCount: 2,
      unmappedAccountCount: 0,
      mappingCoverageScope: "source_snapshot",
    },
    {
      name: "google",
      status: "ready",
      rowCount: 5,
      comparisonCount: 5,
      accountCount: 2,
      mappedAccountCount: 1,
      unmappedAccountCount: 1,
      mappingCoverageScope: "source_snapshot",
    },
  ],
});
const BRAND_MAPPING_COVERAGE = Object.freeze({
  status: "needs_mapping",
  accountCount: 4,
  mappedAccountCount: 3,
  unmappedAccountCount: 1,
  sources: [
    {
      name: "meta",
      label: "Meta",
      accountCount: 2,
      mappedAccountCount: 2,
      unmappedAccountCount: 0,
      scope: "source_snapshot",
      visibleAccountCount: 2,
    },
    {
      name: "google",
      label: "Google Ads",
      accountCount: 2,
      mappedAccountCount: 1,
      unmappedAccountCount: 1,
      scope: "source_snapshot",
      visibleAccountCount: 2,
    },
  ],
});

const servers = [];

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

class MemoryRepository {
  constructor() {
    this.byArtifact = new Map();
    this.byPublic = new Map();
    this.insertCalls = 0;
    this.pingCalls = 0;
  }

  async ping() {
    this.pingCalls += 1;
  }

  async findByArtifactId(artifactId) {
    return this.byArtifact.get(artifactId) || null;
  }

  async findByPublicId(publicId) {
    return this.byPublic.get(publicId) || null;
  }

  async insertOrGet(publication) {
    this.insertCalls += 1;
    const existing = this.byArtifact.get(publication.artifactId);
    if (existing) return { publication: existing, created: false };
    if (this.byPublic.has(publication.publicId)) {
      throw new PublicIdCollisionError();
    }
    const frozen = Object.freeze({
      ...publication,
      revokedAt: null,
      revokedBy: null,
    });
    this.byArtifact.set(publication.artifactId, frozen);
    this.byPublic.set(publication.publicId, frozen);
    return { publication: frozen, created: true };
  }

  async revokeArtifact(artifactId, actor, revokedAt) {
    const existing = this.byArtifact.get(artifactId);
    if (!existing) return null;
    if (existing.revokedAt) return existing;
    const revoked = Object.freeze({
      ...existing,
      revokedAt,
      revokedBy: actor,
    });
    this.byArtifact.set(artifactId, revoked);
    this.byPublic.set(existing.publicId, revoked);
    return revoked;
  }
}

class MemoryObjectStore {
  constructor() {
    this.objects = new Map();
    this.generations = new Map();
    this.putCalls = 0;
  }

  async putImmutable({ artifactId, digest: expected, bytes }) {
    this.putCalls += 1;
    const objectName = objectNameFor("objects", artifactId, expected);
    const existing = this.objects.get(objectName);
    if (existing && !existing.equals(bytes)) throw new ObjectIntegrityError();
    this.objects.set(objectName, Buffer.from(bytes));
    const objectGeneration = this.generations.get(objectName) || "1001";
    this.generations.set(objectName, objectGeneration);
    return { objectName, objectGeneration };
  }

  async readVerified({
    objectName,
    objectGeneration,
    digest: expected,
    byteLength,
  }) {
    const bytes = this.objects.get(objectName);
    if (
      !bytes ||
      this.generations.get(objectName) !== objectGeneration ||
      bytes.length !== byteLength ||
      digest(bytes) !== expected
    ) {
      throw new ObjectIntegrityError();
    }
    return Buffer.from(bytes);
  }

  tamper(objectName, bytes) {
    this.objects.set(objectName, Buffer.from(bytes));
  }
}

class FakeTokenVerifier {
  async verify(token, { audience, allowedCallers }) {
    assert.equal(audience, "https://publisher.example.run.app");
    assert(allowedCallers.has(ACTOR));
    if (token === "valid-token") return { actor: ACTOR, subject: "subject-1" };
    if (token === "forbidden-token") {
      throw new AppError(403, "caller_not_allowed", "Caller is not allowed.");
    }
    throw new AppError(401, "invalid_identity_token", "Authentication failed.");
  }
}

function baseConfig(overrides = {}) {
  return Object.freeze({
    publicOrigin: PUBLIC_ORIGIN,
    ingestAudience: "https://publisher.example.run.app",
    allowedIngestCallers: new Set([ACTOR]),
    defaultTtlSeconds: 1800,
    maxTtlSeconds: 3600,
    maxArtifactBytes: 1024 * 1024,
    enforcePublicHost: false,
    ...overrides,
  });
}

async function startService(options = {}) {
  const repository = options.repository || new MemoryRepository();
  const objectStore = options.objectStore || new MemoryObjectStore();
  const tokenVerifier = options.tokenVerifier || new FakeTokenVerifier();
  const config = options.config || baseConfig();
  const clockState = {
    now: options.now || new Date("2026-08-03T04:00:00.000Z"),
  };
  const ids = [...(options.publicIds || [PUBLIC_ID_A, PUBLIC_ID_B])];
  const logs = [];
  const handler = createDashboardApp({
    repository,
    objectStore,
    tokenVerifier,
    config,
    clock: () => new Date(clockState.now),
    publicIdFactory: () => ids.shift() || "C".repeat(43),
    logger: {
      error: (event) => logs.push(event),
      warn: (event) => logs.push(event),
    },
  });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    repository,
    objectStore,
    clockState,
    logs,
  };
}

async function publish(baseUrl, artifactId, bytes, overrides = {}) {
  return fetch(`${baseUrl}/v1/publications${overrides.query || ""}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${overrides.token || "valid-token"}`,
      "content-type": overrides.contentType || "text/html; charset=utf-8",
      "x-luna-artifact-id": artifactId,
      "x-luna-sha256": overrides.sha256 || digest(bytes),
      "x-luna-entity-id": "tw-entity-001",
      "x-luna-source-digest": SOURCE_DIGEST,
      "x-luna-report-date": "2026-08-03",
      "x-luna-task-id": "task-20260803-001",
      "x-luna-requested-platform": "all",
      "x-luna-platform-coverage": JSON.stringify(PLATFORM_COVERAGE),
      "x-luna-brand-mapping-coverage": JSON.stringify(BRAND_MAPPING_COVERAGE),
      ...(overrides.expiresAt
        ? { "x-luna-expires-at": overrides.expiresAt }
        : {}),
      ...(overrides.headers || {}),
    },
    body: bytes,
  });
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

test("publishes and serves the exact verified bytes with hardened headers", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html><body>report</body></html>");
  const response = await publish(
    service.baseUrl,
    "artifact-20260803-001",
    html,
  );

  assert.equal(response.status, 201);
  const publication = await response.json();
  assert.equal(publication.url, `${PUBLIC_ORIGIN}/d/${PUBLIC_ID_A}`);
  assert.equal(publication.sha256, digest(html));
  assert.equal(publication.state, "active");
  assert.equal(publication.idempotent, false);
  assert.equal(publication.entityId, "tw-entity-001");
  assert.equal(publication.sourceDigest, SOURCE_DIGEST);
  assert.equal(publication.reportDate, "2026-08-03");
  assert.equal(publication.taskId, "task-20260803-001");
  assert.equal(publication.requestedPlatform, "all");
  assert.deepEqual(publication.platformCoverage, PLATFORM_COVERAGE);
  assert.deepEqual(publication.brandMappingCoverage, BRAND_MAPPING_COVERAGE);
  assert.equal("objectName" in publication, false);

  const view = await fetch(`${service.baseUrl}/d/${PUBLIC_ID_A}`);
  assert.equal(view.status, 200);
  assert.deepEqual(Buffer.from(await view.arrayBuffer()), html);
  assert.match(view.headers.get("cache-control"), /no-store/);
  assert.match(
    view.headers.get("content-security-policy"),
    /script-src 'none'/,
  );
  assert.match(view.headers.get("x-robots-tag"), /noindex/);
  assert.equal(view.headers.get("referrer-policy"), "no-referrer");
  assert.equal(view.headers.get("x-frame-options"), "DENY");
  assert.equal(view.headers.get("etag"), `"sha256-${digest(html)}"`);

  const head = await fetch(`${service.baseUrl}/d/${PUBLIC_ID_A}`, {
    method: "HEAD",
  });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal(Number(head.headers.get("content-length")), html.length);
});

test("does not accept a query-string token or an unapproved identity", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html></html>");

  const queryToken = await fetch(
    `${service.baseUrl}/v1/publications?token=valid-token`,
    {
      method: "POST",
      headers: {
        "content-type": "text/html",
        "x-luna-artifact-id": "artifact-query-token",
        "x-luna-sha256": digest(html),
      },
      body: html,
    },
  );
  assert.equal(queryToken.status, 401);
  assert.equal((await queryToken.json()).error.code, "identity_token_required");

  const forbidden = await publish(service.baseUrl, "artifact-forbidden", html, {
    token: "forbidden-token",
  });
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).error.code, "caller_not_allowed");
});

test("rejects digest mismatch, wrong media type, and oversized bytes before storage", async () => {
  const objectStore = new MemoryObjectStore();
  const service = await startService({
    objectStore,
    config: baseConfig({ maxArtifactBytes: 48 }),
  });
  const html = Buffer.from("<!doctype html><html></html>");

  const mismatch = await publish(service.baseUrl, "artifact-mismatch", html, {
    sha256: "0".repeat(64),
  });
  assert.equal(mismatch.status, 422);
  assert.equal((await mismatch.json()).error.code, "sha256_mismatch");

  const wrongType = await publish(service.baseUrl, "artifact-json", html, {
    contentType: "application/json",
  });
  assert.equal(wrongType.status, 415);

  const tooLarge = await publish(
    service.baseUrl,
    "artifact-large",
    Buffer.alloc(49, 65),
  );
  assert.equal(tooLarge.status, 413);
  assert.equal(objectStore.putCalls, 0);
});

test("an identical artifact retry is idempotent and a changed artifact conflicts", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html>same</html>");

  const first = await publish(service.baseUrl, "stable-artifact", html);
  assert.equal(first.status, 201);
  const firstBody = await first.json();

  const retry = await publish(service.baseUrl, "stable-artifact", html);
  assert.equal(retry.status, 200);
  const retryBody = await retry.json();
  assert.equal(retryBody.publicId, firstBody.publicId);
  assert.equal(retryBody.idempotent, true);
  assert.equal(service.objectStore.putCalls, 1);
  assert.equal(service.repository.insertCalls, 1);

  const conflict = await publish(
    service.baseUrl,
    "stable-artifact",
    Buffer.from("<!doctype html><html>changed</html>"),
  );
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, "artifact_id_conflict");
});

test("rejects reuse of an artifact id with different source cross-binding metadata", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html>bound</html>");
  await publish(service.baseUrl, "source-bound-artifact", html);

  const conflict = await publish(
    service.baseUrl,
    "source-bound-artifact",
    html,
    {
      headers: {
        "x-luna-task-id": "task-20260803-different",
      },
    },
  );
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, "artifact_id_conflict");
});

test("rejects missing, oversized, inconsistent, or raw-account coverage metadata", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html>metadata</html>");

  const missing = await publish(service.baseUrl, "metadata-missing", html, {
    headers: { "x-luna-entity-id": "" },
  });
  assert.equal(missing.status, 400);
  assert.equal(
    (await missing.json()).error.code,
    "publication_metadata_missing",
  );

  const oversized = await publish(service.baseUrl, "metadata-oversized", html, {
    headers: {
      "x-luna-platform-coverage": JSON.stringify({
        ...PLATFORM_COVERAGE,
        padding: "x".repeat(4096),
      }),
    },
  });
  assert.equal(oversized.status, 400);
  assert.equal(
    (await oversized.json()).error.code,
    "publication_metadata_too_large",
  );

  const inconsistent = await publish(
    service.baseUrl,
    "metadata-inconsistent",
    html,
    {
      headers: {
        "x-luna-brand-mapping-coverage": JSON.stringify({
          ...BRAND_MAPPING_COVERAGE,
          mappedAccountCount: 4,
          unmappedAccountCount: 0,
        }),
      },
    },
  );
  assert.equal(inconsistent.status, 400);
  assert.equal(
    (await inconsistent.json()).error.code,
    "publication_metadata_invalid",
  );

  const withRawIds = await publish(service.baseUrl, "metadata-raw-id", html, {
    headers: {
      "x-luna-brand-mapping-coverage": JSON.stringify({
        ...BRAND_MAPPING_COVERAGE,
        sources: BRAND_MAPPING_COVERAGE.sources.map((source, index) =>
          index === 0 ? { ...source, accountIds: ["140675171327599"] } : source,
        ),
      }),
    },
  });
  assert.equal(withRawIds.status, 400);
  assert.equal(
    (await withRawIds.json()).error.code,
    "publication_metadata_invalid",
  );

  const invalidDate = await publish(
    service.baseUrl,
    "metadata-invalid-date",
    html,
    {
      headers: { "x-luna-report-date": "2026-99-99" },
    },
  );
  assert.equal(invalidDate.status, 400);
  assert.equal(
    (await invalidDate.json()).error.code,
    "publication_metadata_invalid",
  );
});

test("retries an opaque public id collision without changing artifact identity", async () => {
  const repository = new MemoryRepository();
  const occupied = Object.freeze({
    artifactId: "occupied-artifact",
    publicId: PUBLIC_ID_A,
    sha256: "0".repeat(64),
    objectName: "occupied",
    objectGeneration: "999",
    byteLength: 1,
    createdAt: new Date("2026-08-03T03:00:00Z"),
    expiresAt: new Date("2026-08-03T05:00:00Z"),
    revokedAt: null,
    createdBy: ACTOR,
    revokedBy: null,
  });
  repository.byArtifact.set(occupied.artifactId, occupied);
  repository.byPublic.set(occupied.publicId, occupied);

  const service = await startService({
    repository,
    publicIds: [PUBLIC_ID_A, PUBLIC_ID_B],
  });
  const response = await publish(
    service.baseUrl,
    "new-artifact",
    Buffer.from("<!doctype html><html>new</html>"),
  );
  assert.equal(response.status, 201);
  assert.equal((await response.json()).publicId, PUBLIC_ID_B);
});

test("revocation is immediate and idempotent without revealing viewer state", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html>revoke</html>");
  await publish(service.baseUrl, "artifact-revoke", html);

  const revoke = await fetch(
    `${service.baseUrl}/v1/publications/artifact-revoke/revoke`,
    {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
    },
  );
  assert.equal(revoke.status, 200);
  const revokedAt = (await revoke.json()).revokedAt;

  const retry = await fetch(
    `${service.baseUrl}/v1/publications/artifact-revoke/revoke`,
    {
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
    },
  );
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).revokedAt, revokedAt);

  const view = await fetch(`${service.baseUrl}/d/${PUBLIC_ID_A}`);
  assert.equal(view.status, 404);
  assert.equal((await view.json()).error.code, "not_found");
});

test("expired publication and unknown publication produce the same public response", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html>expiring</html>");
  await publish(service.baseUrl, "artifact-expiring", html, {
    expiresAt: "2026-08-03T04:10:00.000Z",
  });
  service.clockState.now = new Date("2026-08-03T04:11:00.000Z");

  const expired = await fetch(`${service.baseUrl}/d/${PUBLIC_ID_A}`);
  const unknown = await fetch(`${service.baseUrl}/d/${"Z".repeat(43)}`);
  assert.equal(expired.status, 404);
  assert.equal(unknown.status, 404);
  assert.deepEqual(await expired.json(), await unknown.json());
});

test("refuses to serve bytes that no longer match the immutable ledger hash", async () => {
  const service = await startService();
  const html = Buffer.from("<!doctype html><html>verified</html>");
  await publish(service.baseUrl, "artifact-integrity", html);
  const publication =
    await service.repository.findByArtifactId("artifact-integrity");
  service.objectStore.tamper(
    publication.objectName,
    Buffer.from("<!doctype html><html>tampered</html>"),
  );

  const view = await fetch(`${service.baseUrl}/d/${PUBLIC_ID_A}`);
  assert.equal(view.status, 503);
  assert.equal((await view.json()).error.code, "artifact_integrity_failure");
  assert.equal(service.logs[0].route, "viewer");
  assert.equal(JSON.stringify(service.logs).includes(PUBLIC_ID_A), false);
});

test("viewer requires the configured canonical host when enforcement is enabled", async () => {
  const service = await startService({
    config: baseConfig({ enforcePublicHost: true }),
  });
  const html = Buffer.from("<!doctype html><html>canonical</html>");
  await publish(service.baseUrl, "artifact-canonical", html);

  const view = await fetch(`${service.baseUrl}/d/${PUBLIC_ID_A}`);
  assert.equal(view.status, 421);
  assert.equal((await view.json()).error.code, "canonical_host_required");
});

test("readiness checks only repository connectivity", async () => {
  const service = await startService();
  const response = await fetch(`${service.baseUrl}/ready`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ready" });
  assert.equal(service.repository.pingCalls, 1);
});

test("health and legacy z-suffixed aliases remain application-compatible", async () => {
  const service = await startService();

  for (const pathname of ["/health", "/healthz"]) {
    const response = await fetch(`${service.baseUrl}${pathname}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  }

  const legacyReady = await fetch(`${service.baseUrl}/readyz`);
  assert.equal(legacyReady.status, 200);
  assert.deepEqual(await legacyReady.json(), { status: "ready" });
  assert.equal(service.repository.pingCalls, 1);
});

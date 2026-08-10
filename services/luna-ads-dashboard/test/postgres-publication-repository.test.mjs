import assert from "node:assert/strict";
import { test } from "node:test";
import { PublicIdCollisionError } from "../src/errors.mjs";
import { PostgresPublicationRepository } from "../src/postgres-publication-repository.mjs";

const row = Object.freeze({
  artifact_id: "artifact-1",
  public_id: "A".repeat(43),
  sha256: "a".repeat(64),
  object_name: "private/object.html",
  object_generation: "1743654321000000",
  byte_length: "123",
  created_at: "2026-08-03T04:00:00.000Z",
  expires_at: "2026-09-02T04:00:00.000Z",
  revoked_at: null,
  created_by: "luna@example.iam.gserviceaccount.com",
  revoked_by: null,
  entity_id: "tw-entity-001",
  source_digest: "c".repeat(64),
  report_date: "2026-08-03",
  task_id: "task-20260803-001",
  requested_platform: "all",
  platform_coverage: {
    requestedPlatform: "all",
    status: "ready",
    sources: [],
  },
  brand_mapping_coverage: {
    status: "complete",
    accountCount: 0,
    mappedAccountCount: 0,
    unmappedAccountCount: 0,
    sources: [],
  },
});

function expectedPublication() {
  return {
    artifactId: row.artifact_id,
    publicId: row.public_id,
    sha256: row.sha256,
    objectName: row.object_name,
    objectGeneration: row.object_generation,
    byteLength: 123,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    revokedAt: null,
    createdBy: row.created_by,
    revokedBy: null,
    entityId: row.entity_id,
    sourceDigest: row.source_digest,
    reportDate: row.report_date,
    taskId: row.task_id,
    requestedPlatform: row.requested_platform,
    platformCoverage: row.platform_coverage,
    brandMappingCoverage: row.brand_mapping_coverage,
  };
}

test("maps a Cloud SQL ledger row without exposing SQL column names", async () => {
  const calls = [];
  const repository = new PostgresPublicationRepository({
    pool: {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [row] };
      },
    },
  });

  assert.deepEqual(
    await repository.findByArtifactId("artifact-1"),
    expectedPublication(),
  );
  assert.match(calls[0].sql, /WHERE artifact_id = \$1/);
  assert.deepEqual(calls[0].params, ["artifact-1"]);
});

test("inserts a new immutable ledger row and reports creation", async () => {
  const calls = [];
  const repository = new PostgresPublicationRepository({
    pool: {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [row] };
      },
    },
  });

  const result = await repository.insertOrGet(expectedPublication());
  assert.equal(result.created, true);
  assert.deepEqual(result.publication, expectedPublication());
  assert.match(calls[0].sql, /ON CONFLICT \(artifact_id\) DO NOTHING/);
  assert.equal(calls[0].params[0], "artifact-1");
  assert.equal(calls[0].params[2], "a".repeat(64));
  assert.equal(calls[0].params[4], row.object_generation);
  assert.equal(calls[0].params[9], "tw-entity-001");
  assert.equal(calls[0].params[10], "c".repeat(64));
  assert.equal(calls[0].params[13], "all");
  assert.deepEqual(JSON.parse(calls[0].params[14]), row.platform_coverage);
  assert.deepEqual(JSON.parse(calls[0].params[15]), row.brand_mapping_coverage);
});

test("recovers an idempotent artifact race and distinguishes a public id collision", async () => {
  let call = 0;
  const repository = new PostgresPublicationRepository({
    pool: {
      async query() {
        call += 1;
        return call === 1 ? { rows: [] } : { rows: [row] };
      },
    },
  });
  const raced = await repository.insertOrGet(expectedPublication());
  assert.equal(raced.created, false);
  assert.deepEqual(raced.publication, expectedPublication());

  const collision = new PostgresPublicationRepository({
    pool: {
      async query() {
        const error = new Error("duplicate public id");
        error.code = "23505";
        throw error;
      },
    },
  });
  await assert.rejects(
    () => collision.insertOrGet(expectedPublication()),
    PublicIdCollisionError,
  );
});

test("revokes only through the parameterized ledger operation", async () => {
  const calls = [];
  const revokedRow = {
    ...row,
    revoked_at: "2026-08-03T04:30:00.000Z",
    revoked_by: "luna@example.iam.gserviceaccount.com",
  };
  const repository = new PostgresPublicationRepository({
    pool: {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [revokedRow] };
      },
    },
  });
  const revokedAt = new Date(revokedRow.revoked_at);
  const result = await repository.revokeArtifact(
    "artifact-1",
    revokedRow.revoked_by,
    revokedAt,
  );

  assert.equal(result.revokedAt.toISOString(), revokedRow.revoked_at);
  assert.equal(result.revokedBy, revokedRow.revoked_by);
  assert.match(calls[0].sql, /SET revoked_at = COALESCE/);
  assert.deepEqual(calls[0].params, [
    "artifact-1",
    revokedAt,
    revokedRow.revoked_by,
  ]);
});

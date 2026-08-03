import pg from "pg";
import { PublicIdCollisionError } from "./errors.mjs";

const { Pool } = pg;

function fromRow(row) {
  if (!row) return null;
  return Object.freeze({
    artifactId: row.artifact_id,
    publicId: row.public_id,
    sha256: row.sha256,
    objectName: row.object_name,
    objectGeneration: String(row.object_generation),
    byteLength: Number(row.byte_length),
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    createdBy: row.created_by,
    revokedBy: row.revoked_by || null,
    entityId: row.entity_id,
    sourceDigest: row.source_digest,
    reportDate:
      row.report_date instanceof Date
        ? row.report_date.toISOString().slice(0, 10)
        : String(row.report_date),
    taskId: row.task_id,
    requestedPlatform: row.requested_platform,
    platformCoverage: row.platform_coverage,
    brandMappingCoverage: row.brand_mapping_coverage,
  });
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

export class PostgresPublicationRepository {
  constructor({ databaseUrl, pool } = {}) {
    this.pool =
      pool ||
      new Pool({
        connectionString: databaseUrl,
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        application_name: "luna-ads-dashboard",
      });
  }

  async ping() {
    await this.pool.query("SELECT 1");
  }

  async findByArtifactId(artifactId) {
    const result = await this.pool.query(
      `SELECT *
         FROM luna_ads_dashboard_publications
        WHERE artifact_id = $1`,
      [artifactId],
    );
    return fromRow(result.rows[0]);
  }

  async findByPublicId(publicId) {
    const result = await this.pool.query(
      `SELECT *
         FROM luna_ads_dashboard_publications
        WHERE public_id = $1`,
      [publicId],
    );
    return fromRow(result.rows[0]);
  }

  async insertOrGet(publication) {
    let result;
    try {
      result = await this.pool.query(
        `INSERT INTO luna_ads_dashboard_publications (
           artifact_id,
           public_id,
           sha256,
           object_name,
           object_generation,
           byte_length,
           created_at,
           expires_at,
           created_by,
           entity_id,
           source_digest,
           report_date,
           task_id,
           requested_platform,
           platform_coverage,
           brand_mapping_coverage
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb
         )
         ON CONFLICT (artifact_id) DO NOTHING
         RETURNING *`,
        [
          publication.artifactId,
          publication.publicId,
          publication.sha256,
          publication.objectName,
          publication.objectGeneration,
          publication.byteLength,
          publication.createdAt,
          publication.expiresAt,
          publication.createdBy,
          publication.entityId,
          publication.sourceDigest,
          publication.reportDate,
          publication.taskId,
          publication.requestedPlatform,
          JSON.stringify(publication.platformCoverage),
          JSON.stringify(publication.brandMappingCoverage),
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PublicIdCollisionError({ cause: error });
      }
      throw error;
    }

    if (result.rows[0]) {
      return { publication: fromRow(result.rows[0]), created: true };
    }

    const existing = await this.findByArtifactId(publication.artifactId);
    if (!existing) {
      throw new Error(
        "Publication insert lost without an existing artifact row.",
      );
    }
    return { publication: existing, created: false };
  }

  async revokeArtifact(artifactId, actor, revokedAt) {
    const result = await this.pool.query(
      `UPDATE luna_ads_dashboard_publications
          SET revoked_at = COALESCE(revoked_at, $2),
              revoked_by = COALESCE(revoked_by, $3)
        WHERE artifact_id = $1
        RETURNING *`,
      [artifactId, revokedAt, actor],
    );
    return fromRow(result.rows[0]);
  }

  async close() {
    await this.pool.end();
  }
}

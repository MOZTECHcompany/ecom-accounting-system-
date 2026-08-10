BEGIN;

CREATE TABLE IF NOT EXISTS luna_ads_dashboard_publications (
  artifact_id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  sha256 text NOT NULL,
  object_name text NOT NULL,
  object_generation numeric(20, 0) NOT NULL,
  byte_length bigint NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by text NOT NULL,
  revoked_by text,
  entity_id text NOT NULL,
  source_digest text NOT NULL,
  report_date date NOT NULL,
  task_id text NOT NULL,
  requested_platform text NOT NULL,
  platform_coverage jsonb NOT NULL,
  brand_mapping_coverage jsonb NOT NULL,
  CONSTRAINT luna_ads_dashboard_artifact_id_format
    CHECK (artifact_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  CONSTRAINT luna_ads_dashboard_public_id_format
    CHECK (public_id ~ '^[A-Za-z0-9_-]{32,96}$'),
  CONSTRAINT luna_ads_dashboard_sha256_format
    CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT luna_ads_dashboard_object_generation_positive
    CHECK (object_generation > 0),
  CONSTRAINT luna_ads_dashboard_entity_id_format
    CHECK (entity_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$'),
  CONSTRAINT luna_ads_dashboard_source_digest_format
    CHECK (source_digest ~ '^[a-f0-9]{64}$'),
  CONSTRAINT luna_ads_dashboard_task_id_format
    CHECK (task_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$'),
  CONSTRAINT luna_ads_dashboard_requested_platform
    CHECK (requested_platform IN ('all', 'meta', 'google')),
  CONSTRAINT luna_ads_dashboard_platform_coverage_object
    CHECK (
      jsonb_typeof(platform_coverage) = 'object'
      AND octet_length(platform_coverage::text) <= 8192
      AND platform_coverage ->> 'requestedPlatform' = requested_platform
      AND platform_coverage ->> 'status' = 'ready'
    ),
  CONSTRAINT luna_ads_dashboard_brand_mapping_coverage_object
    CHECK (
      jsonb_typeof(brand_mapping_coverage) = 'object'
      AND octet_length(brand_mapping_coverage::text) <= 8192
      AND brand_mapping_coverage ->> 'status' IN ('complete', 'needs_mapping')
    ),
  CONSTRAINT luna_ads_dashboard_byte_length_positive
    CHECK (byte_length > 0),
  CONSTRAINT luna_ads_dashboard_expiry_after_creation
    CHECK (expires_at > created_at),
  CONSTRAINT luna_ads_dashboard_revocation_after_creation
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX IF NOT EXISTS luna_ads_dashboard_active_expiry_idx
  ON luna_ads_dashboard_publications (expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS luna_ads_dashboard_object_name_idx
  ON luna_ads_dashboard_publications (object_name);

CREATE INDEX IF NOT EXISTS luna_ads_dashboard_entity_report_date_idx
  ON luna_ads_dashboard_publications (entity_id, report_date DESC);

COMMENT ON TABLE luna_ads_dashboard_publications IS
  'Immutable LUNA advertising dashboard publication ledger. GCS bytes remain private.';

REVOKE ALL ON TABLE luna_ads_dashboard_publications FROM PUBLIC;

COMMIT;

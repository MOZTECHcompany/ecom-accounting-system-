CREATE TABLE "after_sales_import_runs" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL DEFAULT 'legacy_after_sales',
    "mode" TEXT NOT NULL DEFAULT 'dry_run',
    "status" TEXT NOT NULL DEFAULT 'running',
    "contract_version" TEXT,
    "source_commit" TEXT,
    "feature_baseline" TEXT,
    "scanned_count" INTEGER NOT NULL DEFAULT 0,
    "candidate_count" INTEGER NOT NULL DEFAULT 0,
    "needs_review_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_count" INTEGER NOT NULL DEFAULT 0,
    "unmapped_item_count" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "error_code" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "after_sales_import_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "after_sales_import_candidates" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL DEFAULT 'legacy_after_sales',
    "source_record_id" TEXT NOT NULL,
    "source_case_number" TEXT,
    "source_case_type" TEXT,
    "source_case_status" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "source_deleted_at" TIMESTAMP(3),
    "checksum" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'needs_review',
    "issues" JSONB,
    "payload" JSONB NOT NULL,
    "last_seen_run_id" TEXT NOT NULL,
    "destination_record_id" TEXT,
    "imported_at" TIMESTAMP(3),
    "retention_until" TIMESTAMP(3),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "after_sales_import_candidates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "after_sales_import_runs_entity_id_status_started_at_idx"
    ON "after_sales_import_runs"("entity_id", "status", "started_at");
CREATE INDEX "after_sales_import_runs_entity_id_source_system_started_at_idx"
    ON "after_sales_import_runs"("entity_id", "source_system", "started_at");
CREATE UNIQUE INDEX "after_sales_import_candidates_entity_source_record_key"
    ON "after_sales_import_candidates"("entity_id", "source_system", "source_record_id");
CREATE INDEX "after_sales_import_candidates_entity_decision_last_seen_idx"
    ON "after_sales_import_candidates"("entity_id", "decision", "last_seen_at");
CREATE INDEX "after_sales_import_candidates_last_seen_run_id_idx"
    ON "after_sales_import_candidates"("last_seen_run_id");
CREATE INDEX "after_sales_import_candidates_checksum_idx"
    ON "after_sales_import_candidates"("checksum");

ALTER TABLE "after_sales_import_runs"
    ADD CONSTRAINT "after_sales_import_runs_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "after_sales_import_candidates"
    ADD CONSTRAINT "after_sales_import_candidates_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "after_sales_import_candidates"
    ADD CONSTRAINT "after_sales_import_candidates_last_seen_run_id_fkey"
    FOREIGN KEY ("last_seen_run_id") REFERENCES "after_sales_import_runs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "invoice_sources" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "display_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'authorization_required',
    "sync_mode" TEXT NOT NULL DEFAULT 'read_only',
    "credential_ref" TEXT,
    "cursor" TEXT,
    "config" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_invoice_records" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'invoice',
    "canonical_key" TEXT NOT NULL,
    "invoice_number" TEXT,
    "invoice_date" TIMESTAMP(3),
    "seller_tax_id" TEXT,
    "buyer_tax_id" TEXT,
    "amount_net" DECIMAL(18,2),
    "amount_tax" DECIMAL(18,2),
    "amount_gross" DECIMAL(18,2),
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "source_status" TEXT,
    "ingestion_status" TEXT NOT NULL DEFAULT 'discovered',
    "review_reason" TEXT,
    "matched_type" TEXT,
    "matched_id" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_invoice_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_source_evidences" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "external_record_id" TEXT NOT NULL,
    "evidence_hash" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "raw_metadata" JSONB,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_source_evidences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_sources_identity_key"
    ON "invoice_sources"("entity_id", "connector", "source_key", "direction");
CREATE INDEX "invoice_sources_entity_id_status_idx"
    ON "invoice_sources"("entity_id", "status");

CREATE UNIQUE INDEX "external_invoice_records_canonical_key"
    ON "external_invoice_records"("entity_id", "direction", "canonical_key");
CREATE INDEX "external_invoice_records_entity_direction_status_idx"
    ON "external_invoice_records"("entity_id", "direction", "ingestion_status");
CREATE INDEX "external_invoice_records_entity_invoice_number_idx"
    ON "external_invoice_records"("entity_id", "invoice_number");
CREATE INDEX "external_invoice_records_matched_type_id_idx"
    ON "external_invoice_records"("matched_type", "matched_id");

CREATE UNIQUE INDEX "invoice_source_evidences_external_key"
    ON "invoice_source_evidences"("source_id", "external_record_id");
CREATE INDEX "invoice_source_evidences_record_id_idx"
    ON "invoice_source_evidences"("record_id");
CREATE INDEX "invoice_source_evidences_evidence_hash_idx"
    ON "invoice_source_evidences"("evidence_hash");

ALTER TABLE "invoice_sources"
    ADD CONSTRAINT "invoice_sources_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_invoice_records"
    ADD CONSTRAINT "external_invoice_records_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_source_evidences"
    ADD CONSTRAINT "invoice_source_evidences_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "invoice_sources"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_source_evidences"
    ADD CONSTRAINT "invoice_source_evidences_record_id_fkey"
    FOREIGN KEY ("record_id") REFERENCES "external_invoice_records"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

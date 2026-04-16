-- CreateTable
CREATE TABLE "payout_import_batches" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'statement',
    "imported_by" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_name" TEXT,
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "unmatched_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "payout_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_import_lines" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "payout_date" TIMESTAMP(3),
    "statement_date" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "gateway" TEXT,
    "external_order_id" TEXT,
    "provider_payment_id" TEXT,
    "provider_trade_no" TEXT,
    "authorization_code" TEXT,
    "gross_amount_original" DECIMAL(18,2),
    "fee_amount_original" DECIMAL(18,2),
    "net_amount_original" DECIMAL(18,2),
    "matched_payment_id" TEXT,
    "matched_sales_order_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_import_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_import_batches_entity_id_provider_imported_at_idx" ON "payout_import_batches"("entity_id", "provider", "imported_at");

-- CreateIndex
CREATE INDEX "payout_import_lines_batch_id_status_idx" ON "payout_import_lines"("batch_id", "status");

-- CreateIndex
CREATE INDEX "payout_import_lines_provider_payout_date_idx" ON "payout_import_lines"("provider", "payout_date");

-- CreateIndex
CREATE INDEX "payout_import_lines_matched_payment_id_idx" ON "payout_import_lines"("matched_payment_id");

-- AddForeignKey
ALTER TABLE "payout_import_batches" ADD CONSTRAINT "payout_import_batches_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_import_batches" ADD CONSTRAINT "payout_import_batches_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_import_lines" ADD CONSTRAINT "payout_import_lines_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payout_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

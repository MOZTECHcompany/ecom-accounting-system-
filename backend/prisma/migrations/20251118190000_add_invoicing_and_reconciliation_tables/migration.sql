-- CreateTable: Invoicing Module
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "order_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "invoice_type" TEXT NOT NULL DEFAULT 'B2C',
    "issued_at" TIMESTAMP(3),
    "void_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "buyer_name" TEXT,
    "buyer_tax_id" TEXT,
    "buyer_email" TEXT,
    "buyer_phone" TEXT,
    "buyer_address" TEXT,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "tax_amount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "tax_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "tax_amount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount_original" DECIMAL(18,2) NOT NULL,
    "total_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "total_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "total_amount_base" DECIMAL(18,2) NOT NULL,
    "external_invoice_id" TEXT,
    "external_platform" TEXT,
    "external_payload" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Invoice Lines
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(18,2) NOT NULL,
    "unit_price_original" DECIMAL(18,2) NOT NULL,
    "unit_price_currency" TEXT NOT NULL DEFAULT 'TWD',
    "unit_price_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "unit_price_base" DECIMAL(18,2) NOT NULL,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "tax_amount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "tax_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "tax_amount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Invoice Logs
CREATE TABLE "invoice_logs" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Bank Import Batches
CREATE TABLE "bank_import_batches" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "imported_by" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_name" TEXT,
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "bank_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Reconciliation Results
CREATE TABLE "reconciliation_results" (
    "id" TEXT NOT NULL,
    "bank_transaction_id" TEXT NOT NULL,
    "matched_type" TEXT,
    "matched_id" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "rule_used" TEXT,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matched_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "reconciliation_results_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add batchId to bank_transactions
ALTER TABLE "bank_transactions" ADD COLUMN "batch_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_entity_id_status_idx" ON "invoices"("entity_id", "status");
CREATE INDEX "invoices_order_id_idx" ON "invoices"("order_id");
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");

CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");

CREATE INDEX "invoice_logs_invoice_id_idx" ON "invoice_logs"("invoice_id");
CREATE INDEX "invoice_logs_user_id_idx" ON "invoice_logs"("user_id");

CREATE INDEX "bank_import_batches_entity_id_imported_at_idx" ON "bank_import_batches"("entity_id", "imported_at");

CREATE UNIQUE INDEX "reconciliation_results_bank_transaction_id_key" ON "reconciliation_results"("bank_transaction_id");
CREATE INDEX "reconciliation_results_matched_type_matched_id_idx" ON "reconciliation_results"("matched_type", "matched_id");
CREATE INDEX "reconciliation_results_confidence_idx" ON "reconciliation_results"("confidence");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_logs" ADD CONSTRAINT "invoice_logs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_logs" ADD CONSTRAINT "invoice_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_import_batches" ADD CONSTRAINT "bank_import_batches_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_import_batches" ADD CONSTRAINT "bank_import_batches_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "bank_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reconciliation_results" ADD CONSTRAINT "reconciliation_results_matched_by_fkey" FOREIGN KEY ("matched_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

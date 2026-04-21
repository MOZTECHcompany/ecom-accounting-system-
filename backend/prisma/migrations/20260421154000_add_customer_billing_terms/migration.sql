ALTER TABLE "customers"
ADD COLUMN "payment_terms" TEXT,
ADD COLUMN "payment_term_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "is_monthly_billing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "billing_cycle" TEXT,
ADD COLUMN "statement_email" TEXT,
ADD COLUMN "collection_owner" TEXT,
ADD COLUMN "collection_note" TEXT,
ADD COLUMN "credit_limit" DECIMAL(18,4) NOT NULL DEFAULT 0;

CREATE INDEX "customers_entity_id_type_idx" ON "customers"("entity_id", "type");
CREATE INDEX "customers_entity_id_monthly_billing_idx" ON "customers"("entity_id", "is_monthly_billing");

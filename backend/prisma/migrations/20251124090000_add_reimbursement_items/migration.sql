ALTER TABLE "accounts"
ADD COLUMN IF NOT EXISTS "is_reimbursable" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "reimbursement_items" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "account_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allowed_roles" TEXT,
    "allowed_departments" TEXT,
    "allowed_receipt_types" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reimbursement_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reimbursement_items_entity_id_name_key"
    ON "reimbursement_items" ("entity_id", "name");

CREATE INDEX IF NOT EXISTS "reimbursement_items_entity_id_is_active_idx"
    ON "reimbursement_items" ("entity_id", "is_active");

CREATE INDEX IF NOT EXISTS "reimbursement_items_account_id_idx"
    ON "reimbursement_items" ("account_id");

ALTER TABLE "reimbursement_items"
    ADD CONSTRAINT "reimbursement_items_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reimbursement_items"
    ADD CONSTRAINT "reimbursement_items_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

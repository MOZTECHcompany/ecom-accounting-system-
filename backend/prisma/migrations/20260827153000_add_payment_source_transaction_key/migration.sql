ALTER TABLE "payments"
ADD COLUMN "source_transaction_key" TEXT;

-- Backfill one canonical row per provider transaction. Historical duplicate
-- rows intentionally remain NULL so the migration never deletes or rewrites
-- financial records; they can be reviewed through the existing AR audit flow.
WITH ranked_payments AS (
  SELECT
    "id",
    "entity_id",
    COALESCE("channel_id", "channel") || ':' || "payout_batch_id" AS "source_key",
    ROW_NUMBER() OVER (
      PARTITION BY "entity_id", COALESCE("channel_id", "channel"), "payout_batch_id"
      ORDER BY "reconciled_flag" DESC, "created_at" ASC, "id" ASC
    ) AS "row_rank"
  FROM "payments"
  WHERE "payout_batch_id" IS NOT NULL
    AND BTRIM("payout_batch_id") <> ''
)
UPDATE "payments" AS payment
SET "source_transaction_key" = ranked."source_key"
FROM ranked_payments AS ranked
WHERE payment."id" = ranked."id"
  AND ranked."row_rank" = 1;

CREATE UNIQUE INDEX "payments_entity_source_transaction_key_key"
ON "payments"("entity_id", "source_transaction_key");

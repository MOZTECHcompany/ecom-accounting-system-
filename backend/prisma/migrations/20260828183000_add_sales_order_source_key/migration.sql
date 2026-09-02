ALTER TABLE "sales_orders"
ADD COLUMN "source_order_key" TEXT;

-- Keep every historical row for audit, but assign the durable source identity
-- to exactly one canonical row in each duplicate group. Prefer the order that
-- already carries an issued invoice or the most downstream financial links.
WITH ranked_orders AS (
  SELECT
    sales_order."id",
    sales_order."entity_id",
    sales_order."channel_id" || ':' || BTRIM(sales_order."external_order_id") AS "source_key",
    ROW_NUMBER() OVER (
      PARTITION BY
        sales_order."entity_id",
        sales_order."channel_id",
        BTRIM(sales_order."external_order_id")
      ORDER BY
        EXISTS (
          SELECT 1
          FROM "invoices" AS invoice
          WHERE invoice."order_id" = sales_order."id"
            AND LOWER(invoice."status") = 'issued'
        ) DESC,
        sales_order."has_invoice" DESC,
        (
          SELECT COUNT(*)
          FROM "payments" AS payment
          WHERE payment."sales_order_id" = sales_order."id"
        ) DESC,
        (
          SELECT COUNT(*)
          FROM "sales_order_items" AS item
          WHERE item."sales_order_id" = sales_order."id"
        ) DESC,
        sales_order."updated_at" DESC,
        sales_order."created_at" ASC,
        sales_order."id" ASC
    ) AS "row_rank"
  FROM "sales_orders" AS sales_order
  WHERE sales_order."external_order_id" IS NOT NULL
    AND BTRIM(sales_order."external_order_id") <> ''
)
UPDATE "sales_orders" AS sales_order
SET "source_order_key" = ranked."source_key"
FROM ranked_orders AS ranked
WHERE sales_order."id" = ranked."id"
  AND ranked."row_rank" = 1;

CREATE UNIQUE INDEX "sales_orders_entity_source_order_key_key"
ON "sales_orders"("entity_id", "source_order_key");

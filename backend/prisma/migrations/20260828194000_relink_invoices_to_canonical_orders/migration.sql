-- The durable source identity belongs to one canonical SalesOrder per
-- entity/channel/external order. Invoices must follow that same identity so
-- queue counts and later provider syncs cannot attach financial records to a
-- preserved historical duplicate.
WITH invoice_relinks AS (
  SELECT
    invoice."id" AS "invoice_id",
    canonical_order."id" AS "canonical_order_id"
  FROM "invoices" AS invoice
  INNER JOIN "sales_orders" AS historical_order
    ON historical_order."id" = invoice."order_id"
  INNER JOIN "sales_orders" AS canonical_order
    ON canonical_order."entity_id" = historical_order."entity_id"
    AND canonical_order."channel_id" = historical_order."channel_id"
    AND BTRIM(canonical_order."external_order_id") = BTRIM(historical_order."external_order_id")
    AND canonical_order."source_order_key" IS NOT NULL
  WHERE historical_order."source_order_key" IS NULL
    AND historical_order."external_order_id" IS NOT NULL
    AND BTRIM(historical_order."external_order_id") <> ''
)
UPDATE "invoices" AS invoice
SET
  "order_id" = invoice_relinks."canonical_order_id",
  "updated_at" = NOW()
FROM invoice_relinks
WHERE invoice."id" = invoice_relinks."invoice_id";

-- Rebuild the denormalized invoice pointer from the authoritative Invoice
-- relation. Prefer the newest issued invoice and retain all Invoice rows.
WITH preferred_invoice AS (
  SELECT
    invoice."order_id",
    invoice."id" AS "invoice_id",
    ROW_NUMBER() OVER (
      PARTITION BY invoice."order_id"
      ORDER BY
        (LOWER(invoice."status") = 'issued') DESC,
        invoice."issued_at" DESC NULLS LAST,
        invoice."updated_at" DESC,
        invoice."id" ASC
    ) AS "row_rank"
  FROM "invoices" AS invoice
  INNER JOIN "sales_orders" AS sales_order
    ON sales_order."id" = invoice."order_id"
  WHERE sales_order."source_order_key" IS NOT NULL
)
UPDATE "sales_orders" AS sales_order
SET
  "invoice_id" = preferred_invoice."invoice_id",
  "has_invoice" = EXISTS (
    SELECT 1
    FROM "invoices" AS issued_invoice
    WHERE issued_invoice."order_id" = sales_order."id"
      AND LOWER(issued_invoice."status") = 'issued'
  ),
  "updated_at" = NOW()
FROM preferred_invoice
WHERE sales_order."id" = preferred_invoice."order_id"
  AND preferred_invoice."row_rank" = 1;

-- Historical duplicate rows remain intact for audit, but their denormalized
-- invoice flags must not claim ownership after the authoritative relation has
-- moved to the canonical order.
UPDATE "sales_orders" AS historical_order
SET
  "invoice_id" = NULL,
  "has_invoice" = FALSE,
  "updated_at" = NOW()
WHERE historical_order."source_order_key" IS NULL
  AND historical_order."external_order_id" IS NOT NULL
  AND BTRIM(historical_order."external_order_id") <> ''
  AND EXISTS (
    SELECT 1
    FROM "sales_orders" AS canonical_order
    WHERE canonical_order."entity_id" = historical_order."entity_id"
      AND canonical_order."channel_id" = historical_order."channel_id"
      AND BTRIM(canonical_order."external_order_id") = BTRIM(historical_order."external_order_id")
      AND canonical_order."source_order_key" IS NOT NULL
  );

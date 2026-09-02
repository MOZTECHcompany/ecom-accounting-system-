import { PrismaClient } from '@prisma/client';

const { configureDatabaseUrl } = require('../../../scripts/database-url');
configureDatabaseUrl();

const prisma = new PrismaClient();

function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(value)
      : String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toJsonSafe);
  }
  if (value && typeof value === 'object') {
    if (
      value.constructor?.name === 'Decimal' &&
      typeof (value as { toString?: unknown }).toString === 'function'
    ) {
      const normalized = String(value);
      const numberValue = Number(normalized);
      return Number.isSafeInteger(numberValue) ? numberValue : normalized;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonSafe(item)]),
    );
  }
  return value;
}

async function main() {
  const [summary] = await prisma.$queryRawUnsafe<any[]>(`
    WITH grouped AS (
      SELECT
        "entity_id",
        "channel_id",
        BTRIM("external_order_id") AS "external_order_id",
        COUNT(*) AS "row_count",
        MAX("order_date") AS "latest_order_date"
      FROM "sales_orders"
      WHERE "external_order_id" IS NOT NULL
        AND BTRIM("external_order_id") <> ''
      GROUP BY "entity_id", "channel_id", BTRIM("external_order_id")
    )
    SELECT
      COALESCE(SUM("row_count"), 0) AS "source_order_rows",
      COUNT(*) AS "source_identities",
      COUNT(*) FILTER (WHERE "row_count" > 1) AS "duplicate_groups",
      COALESCE(SUM("row_count" - 1) FILTER (WHERE "row_count" > 1), 0) AS "duplicate_extra_rows",
      COUNT(*) FILTER (
        WHERE "row_count" > 1
          AND "latest_order_date" >= NOW() - INTERVAL '30 days'
      ) AS "duplicate_groups_last_30_days"
    FROM grouped
  `);

  const samples = await prisma.$queryRawUnsafe<any[]>(`
    WITH ranked AS (
      SELECT
        sales_order."id",
        sales_order."entity_id",
        sales_order."channel_id",
        channel."code" AS "channel_code",
        BTRIM(sales_order."external_order_id") AS "external_order_id",
        sales_order."order_date",
        sales_order."total_gross_original",
        sales_order."status",
        sales_order."has_invoice",
        EXISTS (
          SELECT 1
          FROM "invoices" AS invoice
          WHERE invoice."order_id" = sales_order."id"
            AND LOWER(invoice."status") = 'issued'
        ) AS "has_issued_invoice",
        (
          SELECT COUNT(*)
          FROM "payments" AS payment
          WHERE payment."sales_order_id" = sales_order."id"
        ) AS "payment_count",
        (
          SELECT COUNT(*)
          FROM "sales_order_items" AS item
          WHERE item."sales_order_id" = sales_order."id"
        ) AS "item_count",
        COUNT(*) OVER (
          PARTITION BY
            sales_order."entity_id",
            sales_order."channel_id",
            BTRIM(sales_order."external_order_id")
        ) AS "group_count",
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
      LEFT JOIN "sales_channels" AS channel
        ON channel."id" = sales_order."channel_id"
      WHERE sales_order."external_order_id" IS NOT NULL
        AND BTRIM(sales_order."external_order_id") <> ''
    )
    SELECT
      "entity_id",
      "channel_id",
      "channel_code",
      "external_order_id",
      MAX("group_count") AS "row_count",
      MAX("id") FILTER (WHERE "row_rank" = 1) AS "canonical_order_id",
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'orderId', "id",
          'rank', "row_rank",
          'orderDate', "order_date",
          'amount', "total_gross_original",
          'status', "status",
          'hasInvoiceFlag', "has_invoice",
          'hasIssuedInvoice', "has_issued_invoice",
          'paymentCount', "payment_count",
          'itemCount', "item_count"
        )
        ORDER BY "row_rank"
      ) AS "rows"
    FROM ranked
    WHERE "group_count" > 1
    GROUP BY "entity_id", "channel_id", "channel_code", "external_order_id"
    ORDER BY MAX("order_date") DESC, "external_order_id"
    LIMIT 50
  `);

  process.stdout.write(
    `${JSON.stringify(
      toJsonSafe({
        readOnly: true,
        generatedAt: new Date().toISOString(),
        summary,
        samples,
      }),
    )}\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Prisma, PrismaClient, ProductType } from '@prisma/client';
import * as XLSX from 'xlsx';

type RowRecord = Record<string, any>;

type ImportRow = {
  barcode: string;
  name: string;
  warehouseCode: string;
  warehouseName: string;
  serialNumber?: string;
  quantity: number;
};

type ProductCache = {
  id: string;
  name: string;
  hasSerialNumbers: boolean;
};

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function normalizeHeaderKey(key: string): string {
  return String(key || '').trim();
}

function pick(row: RowRecord, keys: string[]): any {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function toNumber(value: any, defaultValue = 0): number {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : defaultValue;
}

function normalizeWarehouseCode(value: string): string {
  const trimmed = String(value || '').trim();
  return trimmed;
}

function parseRowsFromWorkbook(
  filePath: string,
  sheetName?: string,
): { rows: ImportRow[]; rawRows: number } {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const chosenSheetName = sheetName || workbook.SheetNames[0];
  if (!chosenSheetName || !workbook.Sheets[chosenSheetName]) {
    throw new Error(`Sheet not found: ${chosenSheetName}`);
  }

  const sheet = workbook.Sheets[chosenSheetName];
  const raw = XLSX.utils.sheet_to_json<RowRecord>(sheet, {
    defval: '',
    raw: false,
  });

  const rows = raw
    .map((r: RowRecord) => {
      const row: RowRecord = {};
      for (const [k, v] of Object.entries(r)) {
        row[normalizeHeaderKey(k)] = v;
      }

      const barcode = String(
        pick(row, ['品項編碼', '國際條碼', 'Barcode', 'barcode', 'EAN', 'UPC']) ?? '',
      ).trim();
      const name = String(pick(row, ['品項名稱', '品名', '商品名稱', '名稱', 'name']) ?? '').trim();

      const warehouseLocation = String(
        pick(row, ['工業店', '倉庫位置', '倉庫位置名稱', '倉庫', 'warehouse', 'location']) ?? '',
      ).trim();
      const rawWarehouseCode = String(
        pick(row, ['倉庫工廠編碼', '倉庫編碼', '倉庫代碼', 'warehouseCode', 'warehouse_code']) ?? '',
      ).trim();
      const rawWarehouseName = String(
        pick(row, ['倉庫工廠名稱', '倉庫名稱', 'warehouseName', 'warehouse_name']) ?? '',
      ).trim();

      const warehouseName = (rawWarehouseName || warehouseLocation || rawWarehouseCode || '').trim();
      const warehouseCode = normalizeWarehouseCode(
        (rawWarehouseCode || warehouseLocation || rawWarehouseName || '').trim(),
      );

      const serialNumberRaw = pick(row, ['序號/批號', '序號', 'SN', 'sn', 'serialNumber', 'serial_number']);
      const serialNumber = serialNumberRaw ? String(serialNumberRaw).trim() : undefined;
      let quantity = toNumber(pick(row, ['庫存數量', '數量', 'qty', 'quantity']) ?? 0, 0);
      if ((!quantity || quantity <= 0) && serialNumber) quantity = 1;

      if (!barcode) return null;
      if (!warehouseCode || !warehouseName) return null;
      const finalName = name || barcode;

      return {
        barcode,
        name: finalName,
        warehouseCode,
        warehouseName,
        serialNumber: serialNumber || undefined,
        quantity: quantity > 0 ? quantity : 0,
      } satisfies ImportRow;
    })
    .filter((r: ImportRow | null): r is ImportRow => Boolean(r));

  return { rows, rawRows: raw.length };
}

async function main() {
  const file = getArg('--file');
  const entityId = (getArg('--entityId') || 'tw-entity-001').trim();
  const sheet = getArg('--sheet');
  const dryRun = hasFlag('--dry-run');
  const force = hasFlag('--force');

  if (!file) {
    // eslint-disable-next-line no-console
    console.error('Missing --file');
    process.exit(1);
  }

  const absFile = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(absFile)) {
    // eslint-disable-next-line no-console
    console.error(`File not found: ${absFile}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();

  const { rows, rawRows } = parseRowsFromWorkbook(absFile, sheet);
  if (rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No rows found (check headers / sheet).');
    await prisma.$disconnect();
    return;
  }

  const importRef = path.basename(absFile);

  if (!dryRun && !force) {
    const prior = await prisma.inventoryTransaction.count({
      where: {
        entityId,
        referenceType: 'MIGRATION',
        referenceId: importRef,
      },
    });
    if (prior > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `This file looks already imported (referenceId=${importRef}). Use --force to run again.`,
      );
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // 1) Warehouses upsert by (entityId, code)
  const warehouseKeyToId = new Map<string, string>();
  let createdWarehouses = 0;

  // 2) Products upsert by (entityId, sku=barcode)
  const productKeyToCache = new Map<string, ProductCache>();
  let createdProducts = 0;
  let updatedProducts = 0;

  // 3) Aggregate inventory IN per (warehouseId, productId)
  const qtyAgg = new Map<string, Prisma.Decimal>();

  // 4) Serial numbers to create
  const serialRows: Array<{
    entityId: string;
    productId: string;
    warehouseId: string;
    serialNumber: string;
  }> = [];

  // Preload existing warehouses/products for faster mapping
  const [existingWarehouses, existingProducts] = await Promise.all([
    prisma.warehouse.findMany({ where: { entityId } }),
    prisma.product.findMany({ where: { entityId } }),
  ]);

  for (const w of existingWarehouses) {
    warehouseKeyToId.set(`${w.code}`, w.id);
  }
  for (const p of existingProducts) {
    productKeyToCache.set(`${p.sku}`, {
      id: p.id,
      name: p.name,
      hasSerialNumbers: p.hasSerialNumbers,
    });
  }

  // Row-by-row upserts (kept simple; OK for initial migration)
  for (const r of rows) {
    // Warehouse
    let warehouseId = warehouseKeyToId.get(r.warehouseCode);
    if (!warehouseId) {
      if (!dryRun) {
        const created = await prisma.warehouse.create({
          data: {
            entityId,
            code: r.warehouseCode,
            name: r.warehouseName,
            type: 'INTERNAL',
            isActive: true,
          },
        });
        warehouseId = created.id;
      } else {
        warehouseId = `DRYRUN-WH-${r.warehouseCode}`;
      }
      warehouseKeyToId.set(r.warehouseCode, warehouseId);
      createdWarehouses++;
    }

    // Product (sku = barcode)
    const sku = r.barcode;
    const cachedProduct = productKeyToCache.get(sku);
    let productId = cachedProduct?.id;
    if (!productId) {
      if (!dryRun) {
        const created = await prisma.product.create({
          data: {
            entityId,
            sku,
            name: r.name,
            type: ProductType.SIMPLE,
            barcode: r.barcode,
            hasSerialNumbers: Boolean(r.serialNumber),
            isActive: true,
          },
        });
        productId = created.id;
        productKeyToCache.set(sku, {
          id: created.id,
          name: created.name,
          hasSerialNumbers: created.hasSerialNumbers,
        });
      } else {
        productId = `DRYRUN-PROD-${sku}`;
        productKeyToCache.set(sku, {
          id: productId,
          name: r.name,
          hasSerialNumbers: Boolean(r.serialNumber),
        });
      }
      createdProducts++;
    } else {
      // Ensure name present + SN tracking can be enabled
      const needsSn = Boolean(r.serialNumber);
      const current = productKeyToCache.get(sku);
      const shouldUpdateName = Boolean(current && (!current.name || current.name.trim() === '') && r.name);
      const shouldEnableSn = Boolean(current && !current.hasSerialNumbers && needsSn);

      if (shouldUpdateName || shouldEnableSn) {
        productKeyToCache.set(sku, {
          id: productId,
          name: shouldUpdateName ? r.name : (current?.name || r.name),
          hasSerialNumbers: shouldEnableSn ? true : Boolean(current?.hasSerialNumbers),
        });

        if (!dryRun) {
          // Only update minimal fields to avoid overwriting curated data
          await prisma.product.update({
            where: { id: productId },
            data: {
              ...(shouldUpdateName ? { name: r.name } : {}),
              ...(shouldEnableSn ? { hasSerialNumbers: true } : {}),
            },
          });
        }

        updatedProducts++;
      }
    }

    if (r.quantity > 0) {
      const key = `${warehouseId}::${productId}`;
      const prev = qtyAgg.get(key) || new Prisma.Decimal(0);
      qtyAgg.set(key, prev.add(new Prisma.Decimal(r.quantity)));
    }

    if (r.serialNumber && r.serialNumber.trim()) {
      serialRows.push({
        entityId,
        productId,
        warehouseId,
        serialNumber: r.serialNumber.trim(),
      });
    }
  }

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log('[DRY RUN] Summary');
    // eslint-disable-next-line no-console
    console.log({
      rawRows,
      rows: rows.length,
      skippedRows: Math.max(0, rawRows - rows.length),
      createdWarehouses,
      createdProducts,
      updatedProducts,
      inventoryLines: qtyAgg.size,
      serialNumbers: serialRows.length,
    });
    await prisma.$disconnect();
    return;
  }

  // Apply inventory movements + snapshots
  let createdMovements = 0;
  let upsertedSnapshots = 0;

  for (const [key, qty] of qtyAgg.entries()) {
    const [warehouseId, productId] = key.split('::');

    await prisma.$transaction(async (tx) => {
      await tx.inventoryTransaction.create({
        data: {
          entityId,
          warehouseId,
          productId,
          direction: 'IN',
          quantity: qty,
          referenceType: 'MIGRATION',
          referenceId: importRef,
          reason: 'ERP_IMPORT',
          occurredAt: new Date(),
        },
      });

      await tx.inventorySnapshot.upsert({
        where: {
          entityId_warehouseId_productId: {
            entityId,
            warehouseId,
            productId,
          },
        },
        create: {
          entityId,
          warehouseId,
          productId,
          qtyOnHand: qty,
          qtyAllocated: new Prisma.Decimal(0),
          qtyAvailable: qty,
        },
        update: {
          qtyOnHand: { increment: qty },
          qtyAvailable: { increment: qty },
        },
      });
    });

    createdMovements++;
    upsertedSnapshots++;
  }

  // Create SN records in chunks
  let createdSerials = 0;
  const chunkSize = 1000;
  for (let i = 0; i < serialRows.length; i += chunkSize) {
    const chunk = serialRows.slice(i, i + chunkSize);
    const result = await prisma.inventorySerialNumber.createMany({
      data: chunk.map((s) => ({
        entityId: s.entityId,
        productId: s.productId,
        warehouseId: s.warehouseId,
        serialNumber: s.serialNumber,
        status: 'AVAILABLE',
        inboundRefType: 'MIGRATION',
        inboundRefId: importRef,
      })),
      skipDuplicates: true,
    });
    createdSerials += result.count;
  }

  // eslint-disable-next-line no-console
  console.log('✅ ERP inventory import completed');
  // eslint-disable-next-line no-console
  console.log({
    entityId,
    file: absFile,
    sheet: sheet || '(first sheet)',
    rawRows,
    rows: rows.length,
    skippedRows: Math.max(0, rawRows - rows.length),
    createdWarehouses,
    createdProducts,
    updatedProducts,
    inventoryLines: qtyAgg.size,
    createdMovements,
    upsertedSnapshots,
    serialRows: serialRows.length,
    createdSerials,
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Import failed:', err);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  EcountExportAudit,
  ParsedEcountExport,
  parseEcountExportBuffer,
} from '../common/imports/ecount-export';

function getFiles(): string[] {
  const files: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === '--file' && process.argv[index + 1]) {
      files.push(process.argv[index + 1]);
      index += 1;
    }
  }
  return files;
}

function main() {
  const files = getFiles();
  if (files.length === 0) {
    throw new Error('Provide at least one --file <ECOUNT export.xlsx>');
  }

  const parsedExports: ParsedEcountExport[] = files.map((file) => {
    const absolutePath = path.resolve(file);
    if (!fs.existsSync(absolutePath))
      throw new Error(`File not found: ${absolutePath}`);
    return parseEcountExportBuffer({
      sourceFile: absolutePath,
      buffer: fs.readFileSync(absolutePath),
    });
  });
  const audits: EcountExportAudit[] = parsedExports.map(({ audit }) => audit);

  const companies = new Set(
    audits.map((audit) => audit.companyName).filter(Boolean),
  );
  const duplicateKinds =
    audits.length - new Set(audits.map((audit) => audit.kind)).size;
  const items = parsedExports.find(({ audit }) => audit.kind === 'items');
  const inventory = parsedExports.find(
    ({ audit }) => audit.kind === 'inventory_by_warehouse',
  );
  const warehouses = parsedExports.find(
    ({ audit }) => audit.kind === 'warehouses',
  );

  const itemCodes = new Set(
    items?.records.map((record) => record['品項編碼']?.trim()).filter(Boolean),
  );
  const inventoryCodes = new Set(
    inventory?.records
      .map((record) => record['品項編碼']?.trim())
      .filter(Boolean),
  );
  const inventoryItemsMissingFromMaster = inventory
    ? [...inventoryCodes].filter((code) => !itemCodes.has(code)).length
    : 0;

  const warehouseNames = new Set(
    warehouses?.records
      .map((record) => record['倉庫/工廠名稱']?.trim())
      .filter(Boolean),
  );
  const inventoryWarehouseHeaders = inventory
    ? inventory.audit.headers.slice(4)
    : [];
  const unknownInventoryWarehouseHeaders = inventoryWarehouseHeaders.filter(
    (header) => !warehouseNames.has(header),
  ).length;

  const overallIssues: Array<{ code: string; count: number }> = [
    ...(companies.size > 1
      ? [{ code: 'company_name_mismatch', count: companies.size }]
      : []),
    ...(duplicateKinds > 0
      ? [{ code: 'duplicate_export_kind', count: duplicateKinds }]
      : []),
    ...(items && inventory && inventoryItemsMissingFromMaster > 0
      ? [
          {
            code: 'inventory_item_missing_from_master',
            count: inventoryItemsMissingFromMaster,
          },
        ]
      : []),
    ...(warehouses && inventory && unknownInventoryWarehouseHeaders > 0
      ? [
          {
            code: 'inventory_warehouse_missing_from_master',
            count: unknownInventoryWarehouseHeaders,
          },
        ]
      : []),
  ];
  const status =
    overallIssues.length === 0 &&
    audits.every((audit) => audit.status === 'ready')
      ? 'ready'
      : 'needs_review';

  // This output intentionally contains only migration evidence and counts, not row-level PII.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        status,
        generatedAt: new Date().toISOString(),
        companies: [...companies],
        overallIssues,
        crossChecks: {
          inventoryItems: {
            checked: Boolean(items && inventory),
            itemMasterCodes: itemCodes.size,
            inventoryCodes: inventoryCodes.size,
            missingFromItemMaster: inventoryItemsMissingFromMaster,
          },
          inventoryWarehouses: {
            checked: Boolean(warehouses && inventory),
            masterWarehouses: warehouseNames.size,
            inventoryColumns: inventoryWarehouseHeaders.length,
            unknownColumns: unknownInventoryWarehouseHeaders,
          },
        },
        exports: audits,
      },
      null,
      2,
    ),
  );

  if (status !== 'ready') process.exitCode = 2;
}

try {
  main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

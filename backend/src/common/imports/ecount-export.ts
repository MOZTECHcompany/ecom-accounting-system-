import { createHash } from 'node:crypto';
import path from 'node:path';
import * as XLSX from 'xlsx';

type WorkSheet = ReturnType<typeof XLSX.utils.aoa_to_sheet>;

export type EcountExportKind =
  | 'items'
  | 'customers_vendors'
  | 'warehouses'
  | 'departments'
  | 'persons_in_charge'
  | 'projects'
  | 'accounts'
  | 'employees'
  | 'inventory_by_warehouse';

type EcountExportDefinition = {
  label: string;
  requiredHeaders: string[];
  requiredFields: string[];
  primaryKey: string[];
};

export type EcountExportIssue = {
  code:
    | 'blank_required_field'
    | 'duplicate_header'
    | 'duplicate_primary_key'
    | 'invalid_numeric_value'
    | 'inventory_grand_total_mismatch'
    | 'negative_inventory_quantity'
    | 'inventory_row_balance_mismatch'
    | 'missing_company_name';
  count: number;
  field?: string;
  amount?: number;
};

export type EcountExportAudit = {
  status: 'ready' | 'needs_review';
  kind: EcountExportKind;
  label: string;
  sourceFile: string;
  sourceSha256: string;
  sheet: string;
  companyName?: string;
  headerRow: number;
  headers: string[];
  dataRows: number;
  primaryKey: string;
  issues: EcountExportIssue[];
};

export type ParsedEcountExport = {
  audit: EcountExportAudit;
  records: Array<Record<string, string>>;
};

export const ECOUNT_EXPORT_DEFINITIONS: Record<
  EcountExportKind,
  EcountExportDefinition
> = {
  items: {
    label: '品項',
    requiredHeaders: ['品項編碼', '品項名稱', '品項類型', '數量管理'],
    requiredFields: ['品項編碼', '品項名稱'],
    primaryKey: ['品項編碼'],
  },
  customers_vendors: {
    label: '客戶/供應商',
    requiredHeaders: ['客戶/供應商編碼', '客戶/供應商名稱'],
    requiredFields: ['客戶/供應商編碼', '客戶/供應商名稱'],
    primaryKey: ['客戶/供應商編碼'],
  },
  warehouses: {
    label: '倉庫/工廠',
    requiredHeaders: ['倉庫/工廠編碼', '倉庫/工廠名稱', '類型'],
    requiredFields: ['倉庫/工廠編碼', '倉庫/工廠名稱'],
    primaryKey: ['倉庫/工廠編碼'],
  },
  departments: {
    label: '部門',
    requiredHeaders: ['部門編碼', '部門名稱'],
    requiredFields: ['部門編碼', '部門名稱'],
    primaryKey: ['部門編碼'],
  },
  persons_in_charge: {
    label: '承辦人',
    requiredHeaders: ['承辦人編碼', '承辦人姓名'],
    requiredFields: ['承辦人編碼', '承辦人姓名'],
    primaryKey: ['承辦人編碼'],
  },
  projects: {
    label: '專案',
    requiredHeaders: ['專案編碼', '專案名稱'],
    requiredFields: ['專案編碼', '專案名稱'],
    primaryKey: ['專案編碼'],
  },
  accounts: {
    label: '會計科目',
    requiredHeaders: ['[科目編碼]科目名稱', '科目', '借貸類型'],
    requiredFields: ['[科目編碼]科目名稱'],
    primaryKey: ['[科目編碼]科目名稱'],
  },
  employees: {
    label: '職員',
    requiredHeaders: ['職員代碼', '姓名', '部門名稱'],
    requiredFields: ['職員代碼', '姓名'],
    primaryKey: ['職員代碼'],
  },
  inventory_by_warehouse: {
    label: '分倉庫庫存',
    requiredHeaders: ['品項編碼', '品項名稱', '規格', '庫存數量'],
    requiredFields: ['品項編碼', '品項名稱'],
    primaryKey: ['品項編碼', '規格'],
  },
};

function normalizeCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function readRows(sheet: WorkSheet): string[][] {
  return (
    XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][]
  ).map((row) => row.map(normalizeCell));
}

function isEcountExportFooter(row: string[]): boolean {
  const populated = row.filter(Boolean);
  if (populated.length !== 1) return false;
  return /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(populated[0]);
}

function isEcountSummaryRow(row: string[]): boolean {
  return normalizeCell(row[0]) === '合計';
}

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    if (header && record[header] === undefined)
      record[header] = row[index] || '';
  });
  return record;
}

function parseEcountNumber(value: string): number | undefined {
  const normalized = normalizeCell(value).replace(/,/g, '');
  if (!normalized) return 0;
  const accountingNegative = normalized.match(/^\((.+)\)$/);
  const candidate = accountingNegative
    ? `-${accountingNegative[1]}`
    : normalized;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findCompanyName(
  rows: string[][],
  headerIndex: number,
): string | undefined {
  for (const row of rows.slice(0, headerIndex)) {
    for (const cell of row) {
      const match = cell.match(/^公司名稱\s*[:：]\s*(.+)$/);
      if (match?.[1]?.trim()) {
        return match[1].replace(/\s*\/\s*\d{4}\/\d{2}\/\d{2}\s*$/, '').trim();
      }
    }
  }
  return undefined;
}

function findHeader(
  rows: string[][],
  expectedKind?: EcountExportKind,
): { kind: EcountExportKind; index: number } {
  const definitions = expectedKind
    ? ([[expectedKind, ECOUNT_EXPORT_DEFINITIONS[expectedKind]]] as const)
    : (Object.entries(ECOUNT_EXPORT_DEFINITIONS) as Array<
        [EcountExportKind, EcountExportDefinition]
      >);

  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const headers = new Set(rows[index].filter(Boolean));
    for (const [kind, definition] of definitions) {
      if (definition.requiredHeaders.every((header) => headers.has(header))) {
        return { kind, index };
      }
    }
  }

  const suffix = expectedKind ? ` for ${expectedKind}` : '';
  throw new Error(`Unable to identify ECOUNT export headers${suffix}`);
}

export function parseEcountExportBuffer(input: {
  buffer: Buffer;
  sourceFile: string;
  kind?: EcountExportKind;
  sheet?: string;
}): ParsedEcountExport {
  const workbook = XLSX.read(input.buffer, { type: 'buffer', cellDates: true });
  const sheetName = input.sheet || workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheetName || !sheet)
    throw new Error(`Sheet not found: ${sheetName || '(first sheet)'}`);

  const rows = readRows(sheet);
  const detected = findHeader(rows, input.kind);
  const definition = ECOUNT_EXPORT_DEFINITIONS[detected.kind];
  const headers = rows[detected.index].map(normalizeCell);
  const duplicateHeaders = headers.filter(
    (header, index) => header && headers.indexOf(header) !== index,
  );
  const bodyRows = rows.slice(detected.index + 1);
  const summaryRow = bodyRows.find(isEcountSummaryRow);

  const records = bodyRows
    .filter(
      (row) =>
        row.some(Boolean) &&
        !isEcountExportFooter(row) &&
        !isEcountSummaryRow(row),
    )
    .map((row) => rowToRecord(headers, row));

  const issues: EcountExportIssue[] = [];
  if (duplicateHeaders.length > 0) {
    issues.push({
      code: 'duplicate_header',
      count: new Set(duplicateHeaders).size,
    });
  }

  for (const field of definition.requiredFields) {
    const count = records.filter((record) => !record[field]?.trim()).length;
    if (count > 0) issues.push({ code: 'blank_required_field', field, count });
  }

  const primaryKeys = records
    .map((record) => {
      const values = definition.primaryKey.map(
        (field) => record[field]?.trim() || '',
      );
      return values.every((value) => !value) ? '' : values.join('\u241f');
    })
    .filter(Boolean);
  const duplicatePrimaryKeys = primaryKeys.length - new Set(primaryKeys).size;
  if (duplicatePrimaryKeys > 0) {
    issues.push({ code: 'duplicate_primary_key', count: duplicatePrimaryKeys });
  }

  if (detected.kind === 'inventory_by_warehouse') {
    const warehouseHeaders = headers.slice(4).filter(Boolean);
    let invalidNumbers = 0;
    let negativeInventoryQuantity = 0;
    let negativeInventoryRows = 0;
    let rowBalanceMismatches = 0;

    for (const record of records) {
      const total = parseEcountNumber(record['庫存數量']);
      const warehouseValues = warehouseHeaders.map((header) =>
        parseEcountNumber(record[header]),
      );
      if (
        total === undefined ||
        warehouseValues.some((value) => value === undefined)
      ) {
        invalidNumbers += 1;
        continue;
      }
      if (total < 0) {
        negativeInventoryRows += 1;
        negativeInventoryQuantity += total;
      }
      const warehouseTotal = warehouseValues.reduce<number>(
        (sum, value) => sum + (value || 0),
        0,
      );
      if (Math.abs(total - warehouseTotal) > 0.000001)
        rowBalanceMismatches += 1;
    }

    if (invalidNumbers > 0) {
      issues.push({ code: 'invalid_numeric_value', count: invalidNumbers });
    }
    if (negativeInventoryRows > 0) {
      issues.push({
        code: 'negative_inventory_quantity',
        count: negativeInventoryRows,
        amount: negativeInventoryQuantity,
      });
    }
    if (rowBalanceMismatches > 0) {
      issues.push({
        code: 'inventory_row_balance_mismatch',
        count: rowBalanceMismatches,
      });
    }

    if (summaryRow) {
      const summary = rowToRecord(headers, summaryRow);
      const numericHeaders = ['庫存數量', ...warehouseHeaders];
      let grandTotalMismatches = 0;
      for (const header of numericHeaders) {
        const expected = parseEcountNumber(summary[header]);
        const actual = records.reduce((sum, record) => {
          const value = parseEcountNumber(record[header]);
          return sum + (value || 0);
        }, 0);
        if (expected === undefined || Math.abs(expected - actual) > 0.000001) {
          grandTotalMismatches += 1;
        }
      }
      if (grandTotalMismatches > 0) {
        issues.push({
          code: 'inventory_grand_total_mismatch',
          count: grandTotalMismatches,
        });
      }
    }
  }

  const companyName = findCompanyName(rows, detected.index);
  if (!companyName) issues.push({ code: 'missing_company_name', count: 1 });

  return {
    audit: {
      status: issues.length === 0 ? 'ready' : 'needs_review',
      kind: detected.kind,
      label: definition.label,
      sourceFile: path.basename(input.sourceFile),
      sourceSha256: createHash('sha256').update(input.buffer).digest('hex'),
      sheet: sheetName,
      companyName,
      headerRow: detected.index + 1,
      headers: headers.filter(Boolean),
      dataRows: records.length,
      primaryKey: definition.primaryKey.join(' + '),
      issues,
    },
    records,
  };
}

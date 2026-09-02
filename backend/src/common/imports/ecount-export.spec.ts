import * as XLSX from 'xlsx';
import { parseEcountExportBuffer } from './ecount-export';

function workbookBuffer(rows: unknown[][], sheetName = '品項'): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows),
    sheetName,
  );
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('parseEcountExportBuffer', () => {
  it('detects the real header after the ECOUNT company-title row', () => {
    const parsed = parseEcountExportBuffer({
      sourceFile: '/tmp/ESA009M.xlsx',
      buffer: workbookBuffer([
        ['公司名稱 : 萬博創意科技有限公司'],
        ['品項編碼', '品項名稱', '品項類型', '數量管理', '條碼', '入庫單價'],
        ['00001', '運費', '[無形商品]', '數量管理除外', '', '80'],
        ['00021', '商品', '[商品]', '數量管理對象', '4710000000001', '100'],
        ['2026/09/01  18:08:08', '', '', '', '', ''],
      ]),
    });

    expect(parsed.audit).toMatchObject({
      status: 'ready',
      kind: 'items',
      sourceFile: 'ESA009M.xlsx',
      companyName: '萬博創意科技有限公司',
      headerRow: 2,
      dataRows: 2,
      primaryKey: '品項編碼',
      issues: [],
    });
    expect(parsed.records[0]).toMatchObject({
      品項編碼: '00001',
      品項名稱: '運費',
    });
  });

  it('fails closed when required values or primary keys are unsafe', () => {
    const parsed = parseEcountExportBuffer({
      sourceFile: 'items.xlsx',
      kind: 'items',
      buffer: workbookBuffer([
        ['公司名稱：萬博創意科技有限公司'],
        ['品項編碼', '品項名稱', '品項類型', '數量管理'],
        ['00001', '', '[商品]', '數量管理對象'],
        ['00001', '重複品項', '[商品]', '數量管理對象'],
      ]),
    });

    expect(parsed.audit.status).toBe('needs_review');
    expect(parsed.audit.issues).toEqual(
      expect.arrayContaining([
        { code: 'blank_required_field', field: '品項名稱', count: 1 },
        { code: 'duplicate_primary_key', count: 1 },
      ]),
    );
  });

  it('rejects an unrecognized workbook instead of guessing the mapping', () => {
    expect(() =>
      parseEcountExportBuffer({
        sourceFile: 'unknown.xlsx',
        buffer: workbookBuffer([
          ['公司名稱 : 萬博創意科技有限公司'],
          ['不明欄位', '數值'],
          ['A', '1'],
        ]),
      }),
    ).toThrow('Unable to identify ECOUNT export headers');
  });

  it('parses a dated warehouse-inventory export and excludes totals', () => {
    const parsed = parseEcountExportBuffer({
      sourceFile: 'ESZ018R.xlsx',
      buffer: workbookBuffer(
        [
          ['公司名稱 : 萬博創意科技有限公司 / 2026/09/01'],
          ['品項編碼', '品項名稱', '規格', '庫存數量', '工業店', '東莞倉'],
          ['A001', '商品 A', '紅', '3', '1', '2'],
          ['A001', '商品 A', '藍', '4', '4', ''],
          ['合計', '', '', '7', '5', '2'],
          ['2026/09/01  18:21:00', '', '', '', '', ''],
        ],
        '庫存情況',
      ),
    });

    expect(parsed.audit).toMatchObject({
      status: 'ready',
      kind: 'inventory_by_warehouse',
      companyName: '萬博創意科技有限公司',
      dataRows: 2,
      primaryKey: '品項編碼 + 規格',
      issues: [],
    });
  });

  it('flags warehouse inventory rows whose total does not equal warehouse columns', () => {
    const parsed = parseEcountExportBuffer({
      sourceFile: 'ESZ018R.xlsx',
      buffer: workbookBuffer(
        [
          ['公司名稱 : 萬博創意科技有限公司 / 2026/09/01'],
          ['品項編碼', '品項名稱', '規格', '庫存數量', '工業店', '東莞倉'],
          ['A001', '商品 A', '', '3', '1', '1'],
          ['合計', '', '', '3', '1', '1'],
          ['2026/09/01  18:21:00', '', '', '', '', ''],
        ],
        '庫存情況',
      ),
    });

    expect(parsed.audit.status).toBe('needs_review');
    expect(parsed.audit.issues).toContainEqual({
      code: 'inventory_row_balance_mismatch',
      count: 1,
    });
  });

  it('requires review for negative inventory without discarding the row', () => {
    const parsed = parseEcountExportBuffer({
      sourceFile: 'ESZ018R.xlsx',
      buffer: workbookBuffer(
        [
          ['公司名稱 : 萬博創意科技有限公司 / 2026/09/01'],
          ['品項編碼', '品項名稱', '規格', '庫存數量', '工業店', '東莞倉'],
          ['A001', '商品 A', '', '-2', '-2', ''],
          ['合計', '', '', '-2', '-2', ''],
        ],
        '庫存情況',
      ),
    });

    expect(parsed.audit.status).toBe('needs_review');
    expect(parsed.audit.dataRows).toBe(1);
    expect(parsed.audit.issues).toContainEqual({
      code: 'negative_inventory_quantity',
      count: 1,
      amount: -2,
    });
  });
});

# 外部服務整合架構說明

## 1. 整合架構概覽

本系統採用 **Adapter Pattern（適配器模式）** 處理外部服務整合，確保：
- 核心業務邏輯與外部 API 解耦
- 外部服務故障不影響系統正常運作
- 易於切換不同供應商或新增多種整合方式

## 2. 現有整合模組

### 2.1 電子發票模組 (InvoicingModule)

**位置**：`src/modules/invoicing/`

**用途**：與財政部電子發票整合平台（或第三方服務如綠界、藍新）整合

**觸發事件**：
- 訂單完成（`SalesOrderComplete`）→ 預覽發票
- 應收帳款開立（`ArInvoiceCreated`）→ 開立發票
- 退款（`RefundIssued`）→ 開立折讓單

**核心方法**（見 `invoicing.service.ts`）：
- `previewInvoiceForTransaction()` - 預覽發票內容（開立前確認）
- `issueInvoiceForTransaction()` - 向財政部開立發票
- `voidInvoice()` - 作廢發票
- `issueAllowance()` - 開立折讓單

**配置檔**（`schemas/`）：
- `invoice-number-config.schema.ts` - 台灣發票字軌驗證（格式：`AA12345678`）

**外部 API 呼叫位置**：
- 未來在 `invoicing.service.ts` 的 `TODO` 區塊實作
- 建議使用 `@nestjs/axios` 或 SDK（如綠界 SDK）
- 錯誤處理：外部 API 失敗時，標記發票為 `PENDING`，不阻斷業務流程

### 2.2 銀行對帳模組 (ReconciliationModule)

**位置**：`src/modules/reconciliation/`

**用途**：自動匯入銀行交易明細並與會計分錄對帳

**觸發事件**：
- 定時排程（如每日凌晨 3:00）→ 匯入前一日銀行交易
- 手動觸發（透過 Controller）→ 即時匯入與對帳

**核心方法**（見 `reconciliation.service.ts`）：
- `importBankTransactions()` - 從銀行 API 匯入交易明細
- `autoMatchBankTransactions()` - 自動匹配銀行交易與會計分錄
- `getPendingItems()` - 取得待對帳項目
- `manualMatch()` - 手動對帳
- `unmatch()` - 取消對帳

**匹配規則**（`schemas/matching-rules.schema.ts`）：
- **精準匹配**：金額完全相同 + 日期完全相同 + 虛擬帳號
- **模糊匹配**：金額相同 + 日期容差 ±3 天 + 客戶名稱相似度 > 70%
- **信心度計算**：加權評分，≥70% 視為有效匹配

**外部 API 呼叫位置**：
- 未來在 `reconciliation.service.ts` 的 `TODO` 區塊實作
- 多銀行支援：每家銀行各自實作一個 Adapter（見下方架構）

## 3. Adapter Pattern 實作指引

### 3.1 標準目錄結構

```
src/
├── modules/
│   ├── invoicing/
│   │   ├── adapters/                   # 各家電子發票廠商 Adapter
│   │   │   ├── ecpay.adapter.ts        # 綠界
│   │   │   ├── newebpay.adapter.ts     # 藍新
│   │   │   └── gov-einvoice.adapter.ts # 政府平台
│   │   ├── invoicing.service.ts        # 核心邏輯（不含外部 API 呼叫）
│   │   └── ...
│   ├── reconciliation/
│   │   ├── adapters/                   # 各銀行 API Adapter
│   │   │   ├── esun-bank.adapter.ts    # 玉山銀行
│   │   │   ├── ctbc-bank.adapter.ts    # 中信銀行
│   │   │   └── line-bank.adapter.ts    # LINE Bank
│   │   ├── reconciliation.service.ts   # 核心對帳邏輯
│   │   └── ...
```

### 3.2 Adapter 介面範例

**電子發票 Adapter 介面**（`invoicing/interfaces/invoice-adapter.interface.ts`）：

```typescript
export interface InvoiceAdapter {
  /**
   * 開立發票
   */
  issueInvoice(data: IssueInvoiceDto): Promise<{
    success: boolean;
    invoiceNumber: string; // 財政部發票號碼
    externalId: string;    // 外部平台單號
    error?: string;
  }>;

  /**
   * 作廢發票
   */
  voidInvoice(invoiceNumber: string, reason: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * 開立折讓單
   */
  issueAllowance(data: any): Promise<{
    success: boolean;
    allowanceNumber: string;
    error?: string;
  }>;
}
```

**銀行 Adapter 介面**（`reconciliation/interfaces/bank-adapter.interface.ts`）：

```typescript
export interface BankAdapter {
  /**
   * 匯入銀行交易明細
   */
  fetchTransactions(params: {
    startDate: Date;
    endDate: Date;
    accountNumber: string;
  }): Promise<{
    transactions: BankTransactionDto[];
    error?: string;
  }>;

  /**
   * 驗證銀行連線
   */
  testConnection(): Promise<boolean>;
}
```

### 3.3 實作範例：玉山銀行 Adapter

**檔案**：`reconciliation/adapters/esun-bank.adapter.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BankAdapter } from '../interfaces/bank-adapter.interface';
import { BankTransactionDto } from '../dto/import-bank-transactions.dto';

@Injectable()
export class EsunBankAdapter implements BankAdapter {
  private readonly logger = new Logger(EsunBankAdapter.name);

  async fetchTransactions(params: {
    startDate: Date;
    endDate: Date;
    accountNumber: string;
  }): Promise<{ transactions: BankTransactionDto[]; error?: string }> {
    try {
      // TODO: 呼叫玉山銀行 API
      // 1. 使用企業網銀 API 金鑰
      // 2. 呼叫交易明細查詢端點
      // 3. 將玉山格式轉換為系統統一格式

      const response = await this.callEsunApi(params);
      
      const transactions = response.data.map((tx) => ({
        transactionDate: new Date(tx.txDate),
        amount: parseFloat(tx.amount),
        type: tx.type === 'IN' ? 'DEPOSIT' : 'WITHDRAW',
        counterpartyName: tx.counterparty,
        description: tx.description,
        virtualAccount: tx.virtualAccount || null,
      }));

      return { transactions };
    } catch (error) {
      this.logger.error(`玉山銀行 API 呼叫失敗: ${error.message}`);
      return { transactions: [], error: error.message };
    }
  }

  async testConnection(): Promise<boolean> {
    // TODO: 測試 API 連線
    return true;
  }

  private async callEsunApi(params: any): Promise<any> {
    // TODO: 實作玉山銀行 API 呼叫
    throw new Error('Not implemented');
  }
}
```

### 3.4 Service 使用 Adapter

**檔案**：`reconciliation/reconciliation.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { BankAdapter } from './interfaces/bank-adapter.interface';
import { EsunBankAdapter } from './adapters/esun-bank.adapter';
import { CtbcBankAdapter } from './adapters/ctbc-bank.adapter';

@Injectable()
export class ReconciliationService {
  private adapters: Map<string, BankAdapter>;

  constructor(
    private esunAdapter: EsunBankAdapter,
    private ctbcAdapter: CtbcBankAdapter,
  ) {
    // 註冊所有銀行 Adapter
    this.adapters = new Map([
      ['ESUN', esunAdapter],
      ['CTBC', ctbcAdapter],
    ]);
  }

  async importBankTransactions(bankCode: string, params: any) {
    const adapter = this.adapters.get(bankCode);
    if (!adapter) {
      throw new Error(`不支援的銀行代碼: ${bankCode}`);
    }

    // 使用 Adapter 匯入交易
    const result = await adapter.fetchTransactions(params);
    
    if (result.error) {
      // 記錄錯誤但不中斷系統
      this.logger.error(`銀行匯入失敗: ${result.error}`);
      return { success: false, error: result.error };
    }

    // 儲存到資料庫
    await this.saveBankTransactions(result.transactions);
    
    return { success: true, count: result.transactions.length };
  }
}
```

## 4. 新增外部服務整合的步驟

### 4.1 新增銀行整合

1. **建立 Adapter 類別**
   - 檔案：`reconciliation/adapters/新銀行代碼-bank.adapter.ts`
   - 實作 `BankAdapter` 介面

2. **註冊 Adapter**
   - 在 `reconciliation.module.ts` 的 `providers` 加入新 Adapter
   - 在 `reconciliation.service.ts` 的 `adapters` Map 註冊

3. **環境變數配置**
   - `.env` 加入新銀行的 API 金鑰
   - 範例：`新銀行_API_KEY=xxx`, `新銀行_API_SECRET=yyy`

4. **測試**
   - 單元測試：Mock 外部 API 回應
   - 整合測試：使用測試環境 API

### 4.2 新增電子發票廠商

1. **建立 Adapter 類別**
   - 檔案：`invoicing/adapters/廠商名稱.adapter.ts`
   - 實作 `InvoiceAdapter` 介面

2. **註冊 Adapter**
   - 在 `invoicing.module.ts` 註冊
   - 在 `invoicing.service.ts` 使用 Strategy Pattern 選擇 Adapter

3. **配置切換機制**
   - 環境變數：`INVOICE_PROVIDER=ecpay` 或 `INVOICE_PROVIDER=newebpay`
   - 系統啟動時根據環境變數載入對應 Adapter

## 5. 事件驅動整合（未來擴充）

### 5.1 事件定義

建議在 `src/common/events/` 建立事件類別：

```typescript
// src/common/events/sales-order.event.ts
export class SalesOrderCompletedEvent {
  constructor(
    public readonly orderId: string,
    public readonly totalAmount: number,
    public readonly customerId: string,
  ) {}
}
```

### 5.2 事件監聽器

在 `invoicing.service.ts` 監聽事件：

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class InvoicingService {
  @OnEvent('sales-order.completed')
  async handleOrderCompleted(event: SalesOrderCompletedEvent) {
    // 自動開立發票
    await this.issueInvoiceForTransaction({
      transactionType: 'order',
      transactionId: event.orderId,
    });
  }
}
```

## 6. 錯誤處理策略

### 6.1 外部 API 錯誤不應阻斷業務

- **原則**：外部服務故障時，系統應標記為 `PENDING` 並記錄錯誤，而非拋出例外
- **實作**：
  ```typescript
  try {
    const result = await adapter.issueInvoice(data);
    if (!result.success) {
      // 標記為 PENDING，稍後重試
      await this.markInvoiceAsPending(data.transactionId, result.error);
    }
  } catch (error) {
    // 記錄錯誤但不拋出
    this.logger.error(`發票開立失敗: ${error.message}`);
    await this.markInvoiceAsPending(data.transactionId, error.message);
  }
  ```

### 6.2 重試機制

建議使用 Bull Queue（`@nestjs/bull`）實作重試佇列：

```typescript
// 發票開立失敗時，加入重試佇列
await this.invoiceQueue.add('retry-invoice', {
  transactionId: data.transactionId,
  attempt: 1,
}, {
  delay: 5 * 60 * 1000, // 5分鐘後重試
  attempts: 3,          // 最多重試3次
});
```

## 7. 安全性考量

### 7.1 API 金鑰管理

- **絕對不要**將 API 金鑰寫死在程式碼中
- 使用環境變數（`.env`）或 Secrets Manager
- 生產環境建議使用 AWS Secrets Manager 或 Azure Key Vault

### 7.2 資料加密

- 銀行交易明細應加密儲存（敏感欄位如 `accountNumber`）
- 使用 Prisma `@db.Text` + 應用層加密（AES-256）

### 7.3 API 呼叫記錄

- 記錄所有外部 API 呼叫的請求與回應（脫敏後）
- 用於稽核與除錯
- 建議儲存在獨立的 `ApiCallLog` 資料表

## 8. 監控與告警

### 8.1 健康檢查

在 `app.controller.ts` 新增健康檢查端點：

```typescript
@Get('health/integrations')
async checkIntegrations() {
  const results = {
    invoicing: await this.invoicingService.testConnection(),
    esunBank: await this.esunAdapter.testConnection(),
    ctbcBank: await this.ctbcAdapter.testConnection(),
  };
  return results;
}
```

### 8.2 告警機制

- 當外部 API 連續失敗 > 3 次時，發送通知（Email / Slack）
- 監控 `PENDING` 狀態的發票/對帳項目，超過 1 小時未處理則告警

## 9. 測試策略

### 9.1 單元測試

使用 Mock 替代真實 API：

```typescript
describe('InvoicingService', () => {
  let service: InvoicingService;
  let mockAdapter: jest.Mocked<InvoiceAdapter>;

  beforeEach(() => {
    mockAdapter = {
      issueInvoice: jest.fn().mockResolvedValue({
        success: true,
        invoiceNumber: 'AA12345678',
        externalId: 'EXT123',
      }),
    };
    
    service = new InvoicingService(mockAdapter);
  });

  it('should issue invoice successfully', async () => {
    const result = await service.issueInvoiceForTransaction({
      transactionType: 'order',
      transactionId: 'order-123',
    });
    
    expect(result.success).toBe(true);
    expect(mockAdapter.issueInvoice).toHaveBeenCalled();
  });
});
```

### 9.2 整合測試

使用測試環境的真實 API（Sandbox）：

```typescript
describe('InvoicingService Integration', () => {
  it('should call real ECPay sandbox API', async () => {
    const adapter = new EcpayAdapter(testConfig);
    const result = await adapter.issueInvoice(testData);
    
    expect(result.success).toBe(true);
  });
});
```

## 10. 總結

**整合架構關鍵原則**：
1. ✅ 使用 Adapter Pattern 解耦外部服務
2. ✅ 外部服務故障不阻斷核心業務
3. ✅ 統一錯誤處理與重試機制
4. ✅ API 金鑰透過環境變數管理
5. ✅ 充分記錄與監控外部 API 呼叫

**未來擴充方向**：
- 新增更多銀行 Adapter（國泰、台新、永豐等）
- 支援多種電子發票平台（政府平台、綠界、藍新）
- 整合物流追蹤 API（7-11、全家）
- 整合第三方支付（LINE Pay、街口支付）

**維護建議**：
- 每季檢查外部 API 版本更新
- 定期測試 Sandbox 環境連線
- 監控 API 呼叫成功率與回應時間

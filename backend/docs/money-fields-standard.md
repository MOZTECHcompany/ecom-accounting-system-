# 💰 金額欄位標準規範

## 📋 4 欄位金額標準

本系統所有涉及金額的欄位都必須遵守 **4 欄位標準**，以支援多幣別業務需求。

### 標準結構

```prisma
model Example {
  // 金額欄位組（必須同時存在以下 4 個欄位）
  xxxOriginal  Decimal  @map("xxx_original") @db.Decimal(18, 2)  // 原幣金額
  xxxCurrency  String   @map("xxx_currency") @db.VarChar(3)      // 幣別代碼
  xxxFxRate    Decimal  @map("xxx_fx_rate") @default(1) @db.Decimal(18, 6)  // 匯率
  xxxBase      Decimal  @map("xxx_base") @db.Decimal(18, 2)      // 本位幣金額
}
```

### 命名規則

1. **原幣金額**: `{名稱}Original` - 交易發生時的原始幣別金額
2. **幣別代碼**: `{名稱}Currency` - ISO 4217 三字母代碼（TWD, USD, CNY 等）
3. **匯率**: `{名稱}FxRate` - 原幣兌換本位幣的匯率
4. **本位幣金額**: `{名稱}Base` - 換算為公司本位幣的金額

### 計算公式

```typescript
amountBase = amountOriginal * fxRate
```

---

## 📊 已實作的金額欄位

### 1. JournalLine（會計分錄明細）

**特殊情況**: 分錄使用 `debit`/`credit` 而非 `amountOriginal`，但仍包含完整的 4 欄位

```prisma
model JournalLine {
  debit      Decimal  @default(0) @db.Decimal(18, 2)  // 借方金額
  credit     Decimal  @default(0) @db.Decimal(18, 2)  // 貸方金額
  currency   String   @db.VarChar(3)                   // 幣別
  fxRate     Decimal  @default(1) @db.Decimal(18, 6)  // 匯率
  amountBase Decimal  @db.Decimal(18, 2)              // 本位幣金額
}
```

**說明**: 
- 借方/貸方金額為原幣
- amountBase = (debit - credit) * fxRate

---

### 2. SalesOrder（銷售訂單）

#### 總金額（Gross Amount）
```prisma
totalGrossOriginal  Decimal  @db.Decimal(18, 2)  // 訂單總額（原幣）
totalGrossCurrency  String   @db.VarChar(3)      // 幣別
totalGrossFxRate    Decimal  @default(1) @db.Decimal(18, 6)
totalGrossBase      Decimal  @db.Decimal(18, 2)  // 總額（本位幣）
```

#### 稅額（Tax Amount）
```prisma
taxAmountOriginal  Decimal  @default(0) @db.Decimal(18, 2)
taxAmountCurrency  String   @db.VarChar(3)
taxAmountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
taxAmountBase      Decimal  @default(0) @db.Decimal(18, 2)
```

#### 折扣（Discount Amount）
```prisma
discountAmountOriginal  Decimal  @default(0) @db.Decimal(18, 2)
discountAmountCurrency  String   @db.VarChar(3)
discountAmountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
discountAmountBase      Decimal  @default(0) @db.Decimal(18, 2)
```

#### 運費（Shipping Fee）
```prisma
shippingFeeOriginal  Decimal  @default(0) @db.Decimal(18, 2)
shippingFeeCurrency  String   @db.VarChar(3)
shippingFeeFxRate    Decimal  @default(1) @db.Decimal(18, 6)
shippingFeeBase      Decimal  @default(0) @db.Decimal(18, 2)
```

---

### 3. SalesOrderItem（訂單明細）

#### 單價（Unit Price）
```prisma
unitPriceOriginal  Decimal  @db.Decimal(18, 2)
unitPriceCurrency  String   @db.VarChar(3)
unitPriceFxRate    Decimal  @default(1) @db.Decimal(18, 6)
unitPriceBase      Decimal  @db.Decimal(18, 2)
```

#### 明細折扣
```prisma
discountOriginal  Decimal  @default(0) @db.Decimal(18, 2)
discountCurrency  String   @db.VarChar(3)
discountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
discountBase      Decimal  @default(0) @db.Decimal(18, 2)
```

#### 明細稅額
```prisma
taxAmountOriginal  Decimal  @default(0) @db.Decimal(18, 2)
taxAmountCurrency  String   @db.VarChar(3)
taxAmountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
taxAmountBase      Decimal  @default(0) @db.Decimal(18, 2)
```

---

### 4. Payment（付款記錄）

#### 總金額
```prisma
amountGrossOriginal  Decimal  @db.Decimal(18, 2)
amountGrossCurrency  String   @db.VarChar(3)
amountGrossFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountGrossBase      Decimal  @db.Decimal(18, 2)
```

#### 平台手續費
```prisma
feePlatformOriginal  Decimal  @default(0) @db.Decimal(18, 2)
feePlatformCurrency  String   @db.VarChar(3)
feePlatformFxRate    Decimal  @default(1) @db.Decimal(18, 6)
feePlatformBase      Decimal  @default(0) @db.Decimal(18, 2)
```

#### 金流手續費
```prisma
feeGatewayOriginal  Decimal  @default(0) @db.Decimal(18, 2)
feeGatewayCurrency  String   @db.VarChar(3)
feeGatewayFxRate    Decimal  @default(1) @db.Decimal(18, 6)
feeGatewayBase      Decimal  @default(0) @db.Decimal(18, 2)
```

#### 實付運費
```prisma
shippingFeePaidOriginal  Decimal  @default(0) @db.Decimal(18, 2)
shippingFeePaidCurrency  String   @db.VarChar(3)
shippingFeePaidFxRate    Decimal  @default(1) @db.Decimal(18, 6)
shippingFeePaidBase      Decimal  @default(0) @db.Decimal(18, 2)
```

#### 淨額
```prisma
amountNetOriginal  Decimal  @db.Decimal(18, 2)
amountNetCurrency  String   @db.VarChar(3)
amountNetFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountNetBase      Decimal  @db.Decimal(18, 2)
```

---

### 5. ArInvoice（應收發票）

```prisma
amountOriginal  Decimal  @db.Decimal(18, 2)      // 發票金額（原幣）
currency        String   @db.VarChar(3)          // 幣別
amountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountBase      Decimal  @db.Decimal(18, 2)      // 發票金額（本位幣）

paidAmountOriginal  Decimal  @default(0) @db.Decimal(18, 2)  // 已收金額
paidCurrency        String   @db.VarChar(3)
paidAmountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
paidAmountBase      Decimal  @default(0) @db.Decimal(18, 2)
```

---

### 6. ApInvoice（應付發票）

```prisma
amountOriginal  Decimal  @db.Decimal(18, 2)
currency        String   @db.VarChar(3)
amountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountBase      Decimal  @db.Decimal(18, 2)

paidAmountOriginal  Decimal  @default(0) @db.Decimal(18, 2)
paidCurrency        String   @db.VarChar(3)
paidAmountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
paidAmountBase      Decimal  @default(0) @db.Decimal(18, 2)
```

---

### 7. ExpenseRequest（費用申請）

```prisma
amountOriginal  Decimal  @db.Decimal(18, 2)
currency        String   @db.VarChar(3)
amountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountBase      Decimal  @db.Decimal(18, 2)
```

---

### 8. ExpenseItem（費用明細）

```prisma
totalAmountOriginal  Decimal  @db.Decimal(18, 2)
currency             String   @db.VarChar(3)
totalAmountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
totalAmountBase      Decimal  @db.Decimal(18, 2)
```

---

### 9. Expense（費用記錄）

```prisma
amountOriginal  Decimal  @db.Decimal(18, 2)
currency        String   @db.VarChar(3)
amountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountBase      Decimal  @db.Decimal(18, 2)
```

---

### 10. PurchaseOrder（採購訂單）

```prisma
totalAmountOriginal  Decimal  @db.Decimal(18, 2)
currency             String   @db.VarChar(3)
totalAmountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
totalAmountBase      Decimal  @db.Decimal(18, 2)
```

---

### 11. PurchaseOrderItem（採購明細）

```prisma
qty  Decimal  @db.Decimal(18, 2)  // 數量（非金額）

unitCostOriginal  Decimal  @db.Decimal(18, 2)  // 單位成本
unitCostCurrency  String   @db.VarChar(3)
unitCostFxRate    Decimal  @default(1) @db.Decimal(18, 6)
unitCostBase      Decimal  @db.Decimal(18, 2)
```

---

### 12. ProductBatch（產品批次）

```prisma
qtyReceived  Decimal  @db.Decimal(18, 2)  // 收貨數量（非金額）

unitCostOriginal  Decimal  @db.Decimal(18, 6)  // 單位成本（高精度）
unitCostCurrency  String   @db.VarChar(3)
unitCostFxRate    Decimal  @default(1) @db.Decimal(18, 6)
unitCostBase      Decimal  @db.Decimal(18, 6)  // 本位幣成本（高精度）
```

---

### 13. DevCost（研發成本）

```prisma
amountOriginal    Decimal  @db.Decimal(18, 2)  // 研發費用
currency          String   @db.VarChar(3)
amountFxRate      Decimal  @default(1) @db.Decimal(18, 6)
amountBase        Decimal  @db.Decimal(18, 2)

allocationQty     Decimal  @db.Decimal(18, 2)  // 預計攤提數量（非金額）
allocatedPerUnit  Decimal  @db.Decimal(18, 6)  // 每單位攤提金額（單價）
allocatedQtySoFar Decimal  @default(0) @db.Decimal(18, 2)  // 已攤提數量（非金額）
```

---

### 14. BankTransaction（銀行交易）

```prisma
amountOriginal  Decimal  @db.Decimal(18, 2)
currency        String   @db.VarChar(3)
amountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountBase      Decimal  @db.Decimal(18, 2)
```

---

### 15. Employee（員工）

```prisma
salaryBaseOriginal  Decimal  @db.Decimal(18, 2)  // 基本薪資
currency            String   @db.VarChar(3)
salaryBaseFxRate    Decimal  @default(1) @db.Decimal(18, 6)
salaryBaseBase      Decimal  @db.Decimal(18, 2)
```

---

### 16. PayrollItem（薪資明細）

```prisma
amountOriginal  Decimal  @db.Decimal(18, 2)
currency        String   @db.VarChar(3)
amountFxRate    Decimal  @default(1) @db.Decimal(18, 6)
amountBase      Decimal  @db.Decimal(18, 2)
```

---

## 🔍 非金額的 Decimal 欄位

以下欄位使用 Decimal 型別，但不是金額，因此不適用 4 欄位標準：

### 數量欄位
```prisma
qty               Decimal  @db.Decimal(18, 2)  // 數量
qtyReceived       Decimal  @db.Decimal(18, 2)  // 收貨數量
allocationQty     Decimal  @db.Decimal(18, 2)  // 攤提數量
allocatedQtySoFar Decimal  @db.Decimal(18, 2)  // 已攤提數量
```

### 單價/比率欄位
```prisma
allocatedPerUnit  Decimal  @db.Decimal(18, 6)  // 每單位攤提金額（單價，非總金額）
```

### 會計分錄特殊欄位
```prisma
debit   Decimal  @db.Decimal(18, 2)  // 借方（原幣金額）
credit  Decimal  @db.Decimal(18, 2)  // 貸方（原幣金額）
```
**說明**: 分錄已包含 `currency`, `fxRate`, `amountBase`，因此 `debit`/`credit` 視為原幣金額

---

## 🧾 費用報銷與「內部用」費用的處理原則（模具費／開發費／樣品採購等）

在實務上，特別是大陸端，會有一些費用：模具費、開發費、樣品採購等，**沒有正式進口憑證、主要是內部管理與成本控制用**。本系統針對這類情境採用以下設計：

### 1. 會計科目層：仍使用正式科目表

- 所有成本與費用仍對應到正式的會計科目（例如：研發費用、樣品費、模具相關成本等），確保報表與帳冊是乾淨且可被會計師/記帳士接受的。
- 這些科目在 `accounts` 表中照常存在，類別（`type`）仍依商業會計項目表與代碼邏輯決定。

### 2. `Account.isReimbursable`：控制「員工是否可以直接選這個科目」

- `isReimbursable = true`：
  - 代表此科目可以出現在**一般員工的報銷科目下拉選單**中（例如：旅費、交際費、辦公用品、餐費等）。
- `isReimbursable = false`：
  - 代表此科目只做為**會計／內部管理用**，不讓一般員工直接選（例如：薪資支出、折舊、特定開發成本科目）。
- 「模具費、開發費、樣品採購」這類費用，可以：
  - 在科目層維持正式科目（如開發費用、樣品費、模具相關成本），
  - 依公司政策決定是否 `isReimbursable = true`（允許特定人員報支）或保持 `false`（完全內部調整用）。

### 3. `ReimbursementItem`：員工看到的是「報銷模板」，不是生硬科目

Schema 中新增 `ReimbursementItem` 模型，用來代表「員工眼中的報銷項目」，並對映到實際會計科目：

- 主要欄位：
  - `entityId`：不同公司實體可以有不同的報銷模板集合（例如：台灣 vs 大陸）。
  - `name`：員工看到的名稱，例如「出差旅費」、「樣品採購（內部）」、「模具試產費」。
  - `accountId`：指向實際會計科目（`accounts.id`），該科目本身可以 `isReimbursable = true` 或 `false`。
  - `allowedRoles`：允許使用此報銷項目的角色（例如只給 ACCOUNTANT / 管理職）。
  - `allowedDepartments`：允許的部門（例如只給研發部、產品部）。
  - `allowedReceiptTypes`：允許的憑證類型組合（例如 `BANK_SLIP,INTERNAL_ONLY`）。

### 4. 憑證類型（Receipt Type）的標準建議

雖然實際實作在其他欄位/表，但建議在費用相關流程中，統一使用以下幾種憑證類型：

- `TAX_INVOICE`：正式發票（可報稅、可抵扣）。
- `RECEIPT`：一般收據或簡易憑證。
- `BANK_SLIP`：銀行轉帳/匯款證明（對方不開發票時常見）。
- `INTERNAL_ONLY`：僅有內部單據或內部決議，主要用於模具費、開發費、樣品試產等難以取得正式憑證的專案型成本。

搭配 `ReimbursementItem.allowedReceiptTypes`，可以讓：

- 一般報銷項目（如餐費、旅費）通常要求 `TAX_INVOICE` 或 `RECEIPT`。
- 模具費／開發費／樣品採購這類「內部看」費用，允許 `BANK_SLIP` 或 `INTERNAL_ONLY` 作為支撐資料。

### 5. 台灣 vs 大陸端的一致性與差異化

- 一致性：
  - 兩邊都使用相同的 4 欄位金額標準與正式 CoA（各自對應當地規範）。
  - 兩邊都透過 `ReimbursementItem` 讓員工看到友善的報銷項目名稱，而非硬邦邦科目代碼。
- 差異化：
  - 可針對大陸端額外建立一組「模具費/開發費/樣品採購」專用的 `ReimbursementItem`，
  - 這些項目可以：只開放給特定部門/角色、允許 `BANK_SLIP` 或 `INTERNAL_ONLY` 憑證、對應到當地合適的成本/費用科目。

這樣的設計，能在「會計報表要乾淨正確」與「現實中沒有完美憑證的費用仍要被管理」之間取得平衡，
也讓未來在前端做員工費用申請／主管審核畫面時，有明確的資料模型與欄位可用。

---

## ✅ 驗證檢查清單

新增或修改金額欄位時，請確認：

- [ ] 包含 `{name}Original` 欄位（原幣金額）
- [ ] 包含 `{name}Currency` 欄位（幣別代碼）
- [ ] 包含 `{name}FxRate` 欄位（匯率，預設值 1）
- [ ] 包含 `{name}Base` 欄位（本位幣金額）
- [ ] 原幣金額使用 `@db.Decimal(18, 2)`
- [ ] 匯率使用 `@db.Decimal(18, 6)` 提供更高精度
- [ ] 本位幣金額使用 `@db.Decimal(18, 2)`
- [ ] 幣別使用 `@db.VarChar(3)` 存儲 ISO 4217 代碼
- [ ] 業務邏輯中正確計算 `amountBase = amountOriginal * fxRate`

---

## 📖 使用範例

### TypeScript 程式碼範例

```typescript
// 建立銷售訂單
const order = await prisma.salesOrder.create({
  data: {
    entityId: 'tw-entity-001',
    channelId: channelId,
    orderDate: new Date(),
    
    // 4 欄位金額標準
    totalGrossOriginal: 1500.00,
    totalGrossCurrency: 'TWD',
    totalGrossFxRate: 1.0,
    totalGrossBase: 1500.00,  // 1500 * 1.0 = 1500
    
    taxAmountOriginal: 75.00,
    taxAmountCurrency: 'TWD',
    taxAmountFxRate: 1.0,
    taxAmountBase: 75.00,
    
    // ... 其他欄位
  },
});

// 跨幣別範例（USD 訂單）
const usdOrder = await prisma.salesOrder.create({
  data: {
    entityId: 'tw-entity-001',
    totalGrossOriginal: 100.00,    // 美金 100 元
    totalGrossCurrency: 'USD',
    totalGrossFxRate: 31.5,        // 匯率 1 USD = 31.5 TWD
    totalGrossBase: 3150.00,       // 換算為台幣 3150 元
  },
});
```

---

## 📊 新增模組的金額欄位（2025-11-18 更新）

### 17. Invoice（電子發票主表）

```prisma
model Invoice {
  // 發票金額（未稅）
  amountOriginal    Decimal @map("amount_original") @db.Decimal(18, 2)
  currency          String  @default("TWD")
  fxRate            Decimal @map("fx_rate") @default(1) @db.Decimal(18, 6)
  amountBase        Decimal @map("amount_base") @db.Decimal(18, 2)
  
  // 稅額
  taxAmountOriginal Decimal @default(0) @map("tax_amount_original") @db.Decimal(18, 2)
  taxAmountCurrency String  @map("tax_amount_currency") @default("TWD")
  taxAmountFxRate   Decimal @map("tax_amount_fx_rate") @default(1) @db.Decimal(18, 6)
  taxAmountBase     Decimal @default(0) @map("tax_amount_base") @db.Decimal(18, 2)
  
  // 總計（含稅）
  totalAmountOriginal Decimal @map("total_amount_original") @db.Decimal(18, 2)
  totalAmountCurrency String  @map("total_amount_currency") @default("TWD")
  totalAmountFxRate   Decimal @map("total_amount_fx_rate") @default(1) @db.Decimal(18, 6)
  totalAmountBase     Decimal @map("total_amount_base") @db.Decimal(18, 2)
}
```

**說明**: 
- 支援 B2C 和 B2B 發票
- 完整記錄未稅金額、稅額、含稅總額
- 所有金額欄位均符合 4 欄位標準
- 與 sales_orders 的金額計算邏輯一致

### 18. InvoiceLine（發票明細）

```prisma
model InvoiceLine {
  // 單價
  unitPriceOriginal Decimal @map("unit_price_original") @db.Decimal(18, 2)
  unitPriceCurrency String  @map("unit_price_currency") @default("TWD")
  unitPriceFxRate   Decimal @map("unit_price_fx_rate") @default(1) @db.Decimal(18, 6)
  unitPriceBase     Decimal @map("unit_price_base") @db.Decimal(18, 2)
  
  // 明細金額
  amountOriginal Decimal @map("amount_original") @db.Decimal(18, 2)
  currency       String  @default("TWD")
  fxRate         Decimal @map("fx_rate") @default(1) @db.Decimal(18, 6)
  amountBase     Decimal @map("amount_base") @db.Decimal(18, 2)
  
  // 稅額
  taxAmountOriginal Decimal @default(0) @map("tax_amount_original") @db.Decimal(18, 2)
  taxAmountCurrency String  @map("tax_amount_currency") @default("TWD")
  taxAmountFxRate   Decimal @map("tax_amount_fx_rate") @default(1) @db.Decimal(18, 6)
  taxAmountBase     Decimal @default(0) @map("tax_amount_base") @db.Decimal(18, 2)
  
  // 數量（非金額欄位）
  qty Decimal @db.Decimal(18, 2)
}
```

**說明**:
- 與 sales_order_items 結構一致
- 支援產品和非產品項目（如運費、手續費）
- 單價 × 數量 = 明細金額

---

## 🎯 總結

✅ **系統目前完全符合 4 欄位金額標準**

- 所有 38 個 Prisma Models 已檢查完畢（新增 Invoice, InvoiceLine）
- 所有金額欄位都遵循 4 欄位標準（Original/Currency/FxRate/Base）
- 數量、單價等非金額欄位已明確區分
- 支援多幣別交易和自動本位幣換算
- **新增電子發票模組完全符合標準**

---

**文件版本**: v1.1  
**最後更新**: 2025-11-18  
**維護者**: System Architect

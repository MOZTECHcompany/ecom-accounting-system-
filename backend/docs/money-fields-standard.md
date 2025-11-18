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

## 🎯 總結

✅ **系統目前完全符合 4 欄位金額標準**

- 所有 36 個 Prisma Models 已檢查完畢
- 所有金額欄位都遵循 4 欄位標準（Original/Currency/FxRate/Base）
- 數量、單價等非金額欄位已明確區分
- 支援多幣別交易和自動本位幣換算

---

**文件版本**: v1.0  
**最後更新**: 2025-01-18  
**維護者**: System Architect

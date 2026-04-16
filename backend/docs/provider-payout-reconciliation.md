# 金流實際對帳匯入

這套流程用來匯入綠界、HiTRUST 的撥款報表或對帳單，直接回填每筆 Shopify `Payment` 的：

- `feeGatewayOriginal`
- `amountNetOriginal`
- `reconciledFlag`

一旦某筆收款被實際對帳核實，後續再跑 Shopify 同步時，不會把這筆真實手續費覆寫回估算值。

## API

`POST /api/v1/reconciliation/payouts/import`

### 最小 payload

```json
{
  "entityId": "tw-entity-001",
  "provider": "ecpay",
  "fileName": "ecpay-payout-2026-04.csv",
  "rows": [
    {
      "商店訂單編號": "100123",
      "交易序號": "A202604160001",
      "交易金額": 1250,
      "手續費": 34,
      "撥款金額": 1216,
      "撥款日期": "2026-04-16",
      "付款方式": "綠界科技-信用卡一次付清"
    }
  ]
}
```

### 自訂欄位映射

如果你的報表欄位名稱不同，可以加 `mapping`：

```json
{
  "entityId": "tw-entity-001",
  "provider": "hitrust",
  "rows": [
    {
      "OrderRef": "100456",
      "TxnNo": "HITRUST-001",
      "Gross": 2000,
      "Fee": 60,
      "Net": 1940,
      "SettleDate": "2026-04-16"
    }
  ],
  "mapping": {
    "externalOrderId": "OrderRef",
    "providerPaymentId": "TxnNo",
    "grossAmount": "Gross",
    "feeAmount": "Fee",
    "netAmount": "Net",
    "payoutDate": "SettleDate"
  }
}
```

## 匹配邏輯

系統會優先比對：

1. `providerPaymentId`
2. `providerTradeNo`
3. `authorization`
4. Shopify `externalOrderId`
5. 金額與入帳日期接近度

如果同一列對到多筆相似收款，系統會保留成 `unmatched`，避免把錯的手續費寫進帳。

## 匯入前建議

1. 先跑一次 Shopify `sync/transactions`
2. 讓 `Payment.notes` 先帶上最新的 gateway / provider metadata
3. 再匯入綠界或 HiTRUST 的實際報表

這樣自動匹配成功率最高。

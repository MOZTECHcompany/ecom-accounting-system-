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

## 直接串綠界撥款 API

系統依 merchant profile 的 `apiKind` 選擇綠界已開通的對帳協定：

- `trade-media`：既有特店的 `PaymentMedia/TradeNoAio`，以 `CheckMacValue` 驗證。
- `general`：新版 AES `QueryTradeMedia`。
- `shopify`：Shopify 專用媒體檔；不能用來代表一般 ATM、超商或其他通路撥款。

日常查帳不需要先從後台手動匯出報表，也不能只依 profile 名稱猜測協定。
`trade-media` 會同時查詢信用卡撥款補檔，只合併主媒體檔未出現的負數退款；正向信用卡交易不重複匯入。Trade Media V3 的 `=數值` 儲存格會先在共用 CSV 清理層正規化。
信用卡補檔會混入「每日小計」列；這類列雖可能帶負金額，但沒有訂單號、授權單號與交易日期。系統只接受三項追溯欄位齊全的負數退款，小計與其他彙總列一律 fail closed 排除。

先使用不寫資料庫的唯讀預覽：

`POST /api/v1/reconciliation/payouts/ecpay/preview`

確認筆數、交易金額、手續費、退款與淨撥款都和綠界後台一致後，才可使用正式同步：

`POST /api/v1/reconciliation/payouts/ecpay/sync`

舊的 Shopify 相容入口仍保留：

`POST /api/v1/reconciliation/payouts/ecpay-shopify/sync`

### 最小 payload

```json
{
  "merchantKey": "shopify-main",
  "entityId": "tw-entity-001",
  "beginDate": "2026-04-01",
  "endDate": "2026-04-16",
  "dateType": "2"
}
```

### 單筆補查

如果你只想追某一筆 Shopify 付款，可直接帶 `paymentId`：

```json
{
  "merchantKey": "shopify-main",
  "entityId": "tw-entity-001",
  "paymentId": "shopify-payment-id-from-transaction-receipt"
}
```

### 後端設定

建議改成多 merchant profile：

```env
ECPAY_MERCHANTS_JSON='[
  {
    "key": "shopify-main",
    "merchantId": "3290494",
    "hashKey": "replace-me",
    "hashIv": "replace-me",
    "apiKind": "trade-media",
    "apiUrl": "https://vendor.ecpay.com.tw/PaymentMedia/TradeNoAio",
    "creditApiUrl": "https://payment.ecpay.com.tw/CreditDetail/FundingReconDetail",
    "entityId": "tw-entity-001",
    "syncEnabled": false,
    "lookbackDays": 90,
    "dateType": "2",
    "description": "MOZTECH 官網金流；使用一般特店對帳媒體"
  },
  {
    "key": "groupbuy-main",
    "merchantId": "3150241",
    "hashKey": "replace-me",
    "hashIv": "replace-me",
    "apiKind": "trade-media",
    "apiUrl": "https://vendor.ecpay.com.tw/PaymentMedia/TradeNoAio",
    "creditApiUrl": "https://payment.ecpay.com.tw/CreditDetail/FundingReconDetail",
    "entityId": "tw-entity-001",
    "syncEnabled": false,
    "lookbackDays": 90,
    "dateType": "2",
    "description": "團購 / 1Shop"
  }
]'
```

如果目前只想沿用舊設定，原本單一帳號環境變數仍可用：

```env
ECPAY_SHOPIFY_API_URL="https://ecpayment.ecpay.com.tw/Cashier/ShopifyQueryTradeMedia"
ECPAY_SHOPIFY_MERCHANT_ID="..."
ECPAY_SHOPIFY_HASH_KEY="..."
ECPAY_SHOPIFY_HASH_IV="..."
ECPAY_SHOPIFY_SYNC_ENABLED="true"
ECPAY_SHOPIFY_SYNC_LOOKBACK_DAYS="90"
ECPAY_SHOPIFY_QUERY_DATE_TYPE="2"
```

### 注意事項

1. 綠界 API 會檢查來源 IP，Cloud Run 需要固定對外靜態 IP，並把該 IP 加到綠界後台白名單。
2. 若未提供日期區間，系統會用 merchant profile 的 `lookbackDays` 自動補查；若仍沿用舊設定，則使用 `ECPAY_SHOPIFY_SYNC_LOOKBACK_DAYS`。
3. `preview` 只查詢與加總，不建立 payout batch、不更新 `Payment`、不建立會計分錄。
4. 正式同步會把綠界欄位轉成既有的 `payout import` 格式；啟用前必須先完成「provider payout」與「bank reconciliation」狀態分離，不能只因綠界已撥款就視為銀行已入帳。
5. `HashKey / HashIV` 不應寫死在 repo，正式環境建議放在 `GCP Secret Manager`，再由 Cloud Run 注入 `ECPAY_MERCHANTS_JSON`。

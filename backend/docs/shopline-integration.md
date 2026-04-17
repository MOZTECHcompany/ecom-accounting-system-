# SHOPLINE OpenAPI 串接說明

最後更新：2026-04-17

## 本系統目前已完成

- 已建立 SHOPLINE 整合模組：
  - `GET /api/v1/integrations/shopline/health`
  - `GET /api/v1/integrations/shopline/connection-info`
  - `GET /api/v1/integrations/shopline/token-info`
  - `POST /api/v1/integrations/shopline/sync/orders`
  - `POST /api/v1/integrations/shopline/sync/customers`
  - `POST /api/v1/integrations/shopline/sync/auto`
  - `GET /api/v1/integrations/shopline/summary`
  - `POST /api/v1/integrations/shopline/webhook`
- 已接入 `SalesOrder`
- 已接入 `Customer`
- Dashboard reports bucket 已預留 `Shopline 業績`

## 這一版尚未完成

- `transactions / payouts` 仍是 placeholder
- 自動對帳尚未把 Shopline 金流接進 `Payment`
- webhook 目前已開 endpoint，但尚未接正式 topic business logic

## 官方條件摘要

- OpenAPI Base URL：
  - `https://open.shopline.io/v1`
- 驗證方式：
  - `Authorization: Bearer <access_token>`
  - `User-Agent: <handle code>`
- 官方標準 rate limit：
  - `20 requests / second`
- API 時區：
  - `UTC +0`

## 後端環境變數

單店可用：

```env
SHOPLINE_API_BASE_URL="https://open.shopline.io/v1"
SHOPLINE_ACCESS_TOKEN=""
SHOPLINE_HANDLE=""
SHOPLINE_STORE_NAME=""
SHOPLINE_MERCHANT_ID=""
SHOPLINE_DEFAULT_ENTITY_ID="tw-entity-001"
SHOPLINE_SYNC_ENABLED="false"
SHOPLINE_SYNC_LOOKBACK_MINUTES="180"
SHOPLINE_SYNC_PER_PAGE="50"
SHOPLINE_SYNC_JOB_TOKEN=""
```

多店建議用：

```env
SHOPLINE_STORES_JSON='[
  {
    "token": "...",
    "handle": "your-shop-handle",
    "storeName": "SHOPLINE 主店",
    "merchantId": "..."
  }
]'
```

## 建議測試順序

### 1. 驗證憑證

```bash
curl -H "Authorization: Bearer <token>" \
  https://<backend>/api/v1/integrations/shopline/health
```

### 2. 查 token 對應店家資訊

```bash
curl -H "Authorization: Bearer <token>" \
  https://<backend>/api/v1/integrations/shopline/token-info
```

### 3. 手動同步近三天訂單

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  https://<backend>/api/v1/integrations/shopline/sync/orders \
  -d '{
    "entityId": "tw-entity-001",
    "since": "2026-04-14T00:00:00.000Z",
    "until": "2026-04-17T23:59:59.000Z"
  }'
```

### 4. 手動同步近三天顧客

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  https://<backend>/api/v1/integrations/shopline/sync/customers \
  -d '{
    "entityId": "tw-entity-001",
    "since": "2026-04-14T00:00:00.000Z",
    "until": "2026-04-17T23:59:59.000Z"
  }'
```

### 5. 查摘要

```bash
curl -H "Authorization: Bearer <token>" \
  "https://<backend>/api/v1/integrations/shopline/summary?entityId=tw-entity-001"
```

## 下一步

1. 補 token 後，先跑 `token-info`
2. 確認 handle / merchant id
3. 接 Cloud Scheduler
4. 接 webhook topic
5. 把 payment / payout / reconciliation 串進既有對帳流程

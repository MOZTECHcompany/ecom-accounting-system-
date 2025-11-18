# 🧪 最終測試與驗證檢查清單

## 測試環境要求

### 前置條件
- ✅ Node.js 20+ 已安裝
- ✅ PostgreSQL 16 執行中
- ✅ 環境變數已設定（.env 檔案）

---

## 📋 測試步驟

### 1️⃣ Backend 編譯測試

**目標**: 確認所有 TypeScript 程式碼無編譯錯誤

```bash
cd /workspaces/ecom-accounting-system-/backend
npm run build
```

**預期結果**:
```
✔ Built successfully
✔ Output: dist/
✔ 0 errors, 0 warnings
```

**驗證點**:
- [ ] 編譯成功，無 TypeScript 錯誤
- [ ] 產生 `dist/` 目錄
- [ ] 所有模組（13個）都正確編譯

---

### 2️⃣ Prisma Migration 測試

**目標**: 確認資料庫 Schema 正確且可套用

```bash
cd /workspaces/ecom-accounting-system-/backend
npx prisma migrate dev --name init
```

**預期結果**:
```
✔ Prisma schema loaded from prisma/schema.prisma
✔ Datasource "db": PostgreSQL database "ecommerce_accounting"
✔ 36 models found in schema
✔ Migration "20250101000000_init" applied successfully
```

**驗證點**:
- [ ] 36 個 Models 全部建表成功
- [ ] Foreign keys 建立正確
- [ ] Indexes 建立成功
- [ ] 無 Schema 衝突錯誤

---

### 3️⃣ Seed 資料載入測試

**目標**: 確認初始資料正確建立

```bash
cd /workspaces/ecom-accounting-system-/backend
npm run prisma:seed
```

**預期結果**:
```
🌱 Seeding database...

✅ Created 2 entities:
  - TW Entity (tw-entity-001) - Base currency: TWD
  - CN Entity (cn-entity-001) - Base currency: CNY

✅ Created 3 roles:
  - ADMIN: System Administrator
  - ACCOUNTANT: Accounting Staff
  - OPERATOR: Operations Staff

✅ Created admin user: admin@example.com

✅ Created 64 accounts:
  - Assets: 20 accounts
  - Liabilities: 12 accounts
  - Equity: 8 accounts
  - Revenue: 12 accounts
  - Expenses: 12 accounts

✅ Created 9 sales channels:
  - SHOPIFY (Shopify 官網)
  - 1SHOP (1shop 團購)
  - SHOPLINE (SHOPLINE)
  - MOMO (momo 購物)
  - PCHOME (PChome 商店街)
  - SHOPEE (Shopee 蝦皮)
  - COUPANG (Coupang)
  - AMAZON (Amazon)
  - TTSHOP (TikTok Shop)

✅ Created 24 periods:
  - 2025-01 to 2025-12 for TW Entity
  - 2025-01 to 2025-12 for CN Entity

🎉 Seeding completed successfully!
```

**驗證點**:
- [ ] 2 個 Entities 建立（台灣TWD、大陸CNY）
- [ ] 3 個 Roles 建立（ADMIN、ACCOUNTANT、OPERATOR）
- [ ] 1 個 Admin 使用者建立（admin@example.com）
- [ ] 64 個會計科目建立（資產/負債/權益/收入/費用）
- [ ] 9 個銷售渠道建立
- [ ] 24 個會計期間建立（2025年 × 2實體）

---

### 4️⃣ Backend 啟動測試

**目標**: 確認 NestJS 應用正確啟動，所有模組載入成功

```bash
cd /workspaces/ecom-accounting-system-/backend
npm run start:dev
```

**預期結果**:
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] PrismaModule dependencies initialized
[Nest] INFO [InstanceLoader] AuthModule dependencies initialized
[Nest] INFO [InstanceLoader] UsersModule dependencies initialized
[Nest] INFO [InstanceLoader] EntitiesModule dependencies initialized
[Nest] INFO [InstanceLoader] AccountingModule dependencies initialized
[Nest] INFO [InstanceLoader] SalesModule dependencies initialized
[Nest] INFO [InstanceLoader] CostModule dependencies initialized
[Nest] INFO [InstanceLoader] ArModule dependencies initialized
[Nest] INFO [InstanceLoader] ApModule dependencies initialized
[Nest] INFO [InstanceLoader] ExpenseModule dependencies initialized
[Nest] INFO [InstanceLoader] BankingModule dependencies initialized
[Nest] INFO [InstanceLoader] PayrollModule dependencies initialized
[Nest] INFO [InstanceLoader] ApprovalsModule dependencies initialized
[Nest] INFO [InstanceLoader] ReportsModule dependencies initialized
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO [NestApplication] Application is running on: http://localhost:3000
[Nest] INFO [NestApplication] Swagger documentation: http://localhost:3000/api-docs
```

**驗證點**:
- [ ] 所有 12 個業務模組成功初始化
- [ ] PrismaModule 正確連接資料庫
- [ ] HTTP Server 在 3000 端口啟動
- [ ] Swagger 文件可訪問（http://localhost:3000/api-docs）
- [ ] 無啟動錯誤或警告

---

### 5️⃣ Frontend 啟動測試

**目標**: 確認 React 應用正確啟動

```bash
cd /workspaces/ecom-accounting-system-/frontend
npm run dev
```

**預期結果**:
```
VITE v5.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**驗證點**:
- [ ] Vite dev server 在 5173 端口啟動
- [ ] 可訪問 http://localhost:5173
- [ ] 無編譯錯誤
- [ ] React 應用正確渲染

---

## 🧪 API 功能測試

### Test 1: 登入功能（POST /api/v1/auth/login）

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123456"
  }'
```

**預期回應**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.xxx",
  "user": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "email": "admin@example.com",
    "name": "系統管理員",
    "roles": ["ADMIN"]
  }
}
```

**驗證點**:
- [ ] HTTP Status 200/201
- [ ] 回傳有效的 JWT token
- [ ] user 物件包含正確資訊
- [ ] roles 陣列包含 "ADMIN"

---

### Test 2: 查詢會計科目（GET /api/v1/accounting/accounts）

**先取得 Token** (從 Test 1 的回應中取得)

```bash
TOKEN="YOUR_ACCESS_TOKEN_HERE"
ENTITY_ID="tw-entity-001"

curl -X GET "http://localhost:3000/api/v1/accounting/accounts?entityId=$ENTITY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**預期回應**:
```json
[
  {
    "id": "xxx",
    "entityId": "tw-entity-001",
    "code": "1111",
    "name": "現金",
    "type": "ASSET",
    "isActive": true
  },
  {
    "id": "xxx",
    "entityId": "tw-entity-001",
    "code": "1121",
    "name": "銀行存款",
    "type": "ASSET",
    "isActive": true
  }
  // ... 共 64 筆
]
```

**驗證點**:
- [ ] HTTP Status 200
- [ ] 回傳 64 筆會計科目
- [ ] 每筆資料包含完整欄位
- [ ] entityId 正確過濾
- [ ] JWT 驗證通過

---

### Test 3: 建立模擬訂單（POST /api/v1/sales/orders/mock）

```bash
TOKEN="YOUR_ACCESS_TOKEN_HERE"
ENTITY_ID="tw-entity-001"

curl -X POST "http://localhost:3000/api/v1/sales/orders/mock?entityId=$ENTITY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**預期回應**:
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "orderNumber": "SO-20250101-0001",
  "entityId": "tw-entity-001",
  "channelId": "xxx",
  "orderDate": "2025-01-01T00:00:00.000Z",
  "status": "COMPLETED",
  "totalGrossOriginal": 1500.00,
  "totalGrossCurrency": "TWD",
  "totalGrossFxRate": 1.0,
  "totalGrossBase": 1500.00,
  "items": [
    {
      "productId": "xxx",
      "quantity": 2,
      "unitPriceOriginal": 750.00
    }
  ]
}
```

**驗證點**:
- [ ] HTTP Status 200/201
- [ ] 訂單成功建立
- [ ] 4欄位金額正確（Original/Currency/FxRate/Base）
- [ ] 訂單號碼自動產生
- [ ] 關聯資料正確建立

---

### Test 4: 損益表查詢（GET /api/v1/reports/income-statement）

```bash
TOKEN="YOUR_ACCESS_TOKEN_HERE"
ENTITY_ID="tw-entity-001"

curl -X GET "http://localhost:3000/api/v1/reports/income-statement?entityId=$ENTITY_ID&startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

**預期回應**:
```json
{
  "entityId": "tw-entity-001",
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  },
  "currency": "TWD",
  "revenue": {
    "total": 0.00,
    "accounts": []
  },
  "expenses": {
    "total": 0.00,
    "accounts": []
  },
  "netIncome": 0.00
}
```

**驗證點**:
- [ ] HTTP Status 200
- [ ] 回傳正確的報表結構
- [ ] 期間參數正確處理
- [ ] 金額計算正確
- [ ] 本位幣正確顯示

---

## ✅ 完整測試檢查表

### 編譯與構建
- [ ] Backend TypeScript 編譯成功（0 errors）
- [ ] Frontend Vite build 成功

### 資料庫
- [ ] Prisma Schema 套用成功（36 models）
- [ ] Seed 資料載入成功（2 entities, 3 roles, 1 admin, 64 accounts, 9 channels, 24 periods）
- [ ] 所有 Foreign Keys 正確建立
- [ ] 所有 Indexes 正確建立

### 服務啟動
- [ ] Backend 在 port 3000 成功啟動
- [ ] Frontend 在 port 5173 成功啟動
- [ ] 所有 12 個模組初始化成功
- [ ] Swagger 文件可訪問

### API 功能
- [ ] POST /api/v1/auth/login - 登入成功，回傳 JWT
- [ ] GET /api/v1/accounting/accounts - 查詢成功，回傳 64 筆
- [ ] POST /api/v1/sales/orders/mock - 建立成功，4欄位金額正確
- [ ] GET /api/v1/reports/income-statement - 查詢成功，報表結構正確

### 權限控制
- [ ] 未登入訪問受保護路由回傳 401
- [ ] JWT 驗證正確運作
- [ ] @Roles() decorator 正確限制權限

### 資料完整性
- [ ] 4 欄位金額標準在所有訂單/發票/費用中正確使用
- [ ] 會計分錄借貸平衡驗證運作
- [ ] 會計期間鎖帳機制運作

---

## 🐛 常見問題排除

### 問題 1: npm install 失敗
```bash
# 清除 cache 重試
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 問題 2: Prisma Client 未產生
```bash
npx prisma generate
```

### 問題 3: 資料庫連線失敗
```bash
# 檢查 PostgreSQL 是否執行
docker ps | grep postgres

# 檢查 DATABASE_URL
echo $DATABASE_URL

# 測試連線
npx prisma db pull
```

### 問題 4: Port 被占用
```bash
# 找出占用 port 的 process
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

---

## 📊 測試報告範本

```
===========================================
電商會計系統 - 最終測試報告
執行日期: YYYY-MM-DD HH:mm:ss
執行者: [姓名]
===========================================

【環境資訊】
- Node.js: v20.x.x
- PostgreSQL: 16.x
- OS: [Linux/macOS/Windows]

【測試結果】
✅ Backend 編譯: PASS
✅ Frontend 編譯: PASS
✅ Database Migration: PASS (36 models)
✅ Database Seed: PASS (2/3/1/64/9/24)
✅ Backend 啟動: PASS (12 modules)
✅ Frontend 啟動: PASS
✅ API Test 1 (Login): PASS
✅ API Test 2 (Accounts): PASS (64 records)
✅ API Test 3 (Mock Order): PASS
✅ API Test 4 (Income Statement): PASS

【總結】
所有測試項目通過 ✅
系統可正式上線使用 🎉

【備註】
[任何額外觀察或建議]
===========================================
```

---

## 🔥 實戰流程驗收（第三版新增）

### 11️⃣ 電子發票完整流程驗收

**目標**: 驗證訂單 → 發票 → 作廢/折讓的完整流程

#### 步驟 1: 建立測試訂單
```bash
# 使用現有種子資料的訂單，或透過 API 建立新訂單
ORDER_ID="[從種子資料或 sales orders 取得]"
```

#### 步驟 2: 預覽發票
```bash
curl -X GET http://localhost:3000/invoicing/preview/$ORDER_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq
```

**驗證點**:
- [ ] 回應包含 `amountOriginal`, `taxAmountOriginal`, `totalAmountOriginal`
- [ ] 稅額計算正確（5%）
- [ ] `estimatedInvoiceNumber` 格式正確（AA + 8位數字）
- [ ] `invoiceLines` 陣列包含訂單明細

#### 步驟 3: 開立發票
```bash
curl -X POST http://localhost:3000/invoicing/issue/$ORDER_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceType": "B2C",
    "buyerName": "測試客戶",
    "buyerEmail": "test@example.com"
  }' | jq
```

**驗證點**:
- [ ] 回應 `success: true`
- [ ] 回應包含 `invoiceId` 和 `invoiceNumber`
- [ ] 資料庫 `invoices` 表新增一筆記錄
- [ ] 資料庫 `invoice_lines` 表新增明細記錄
- [ ] 資料庫 `invoice_logs` 表記錄 `issue` 動作
- [ ] `sales_orders.has_invoice` 更新為 `true`

#### 步驟 4: 重複開立（應失敗）
```bash
# 再次執行步驟3的命令
```

**驗證點**:
- [ ] 回應 HTTP 409 Conflict
- [ ] 錯誤訊息: "訂單已開立發票，不可重複開立"

#### 步驟 5: 查詢發票狀態
```bash
curl -X GET http://localhost:3000/invoicing/by-order/$ORDER_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq
```

**驗證點**:
- [ ] 回應包含發票主表資料
- [ ] 包含 `invoiceLines` 明細
- [ ] 包含 `invoiceLogs` 操作記錄

#### 步驟 6: 作廢發票
```bash
INVOICE_ID="[從步驟5取得]"
curl -X POST http://localhost:3000/invoicing/$INVOICE_ID/void \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "測試作廢"}' | jq
```

**驗證點**:
- [ ] 回應 `success: true`
- [ ] 資料庫 `invoices.status` 更新為 `void`
- [ ] `invoices.void_at` 和 `void_reason` 已記錄
- [ ] `invoice_logs` 新增 `void` 記錄
- [ ] `sales_orders.has_invoice` 恢復為 `false`

---

### 12️⃣ 銀行對帳完整流程驗收

**目標**: 驗證匯入 → 自動對帳 → 手動對帳的完整流程

#### 步驟 1: 準備測試資料
```bash
# 確認有可用的 bankAccountId 和 entityId
ENTITY_ID="[從種子資料取得]"
BANK_ACCOUNT_ID="[從種子資料取得]"
```

#### 步驟 2: 匯入銀行交易
```bash
curl -X POST http://localhost:3000/reconciliation/bank/import \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "'$ENTITY_ID'",
    "bankAccountId": "'$BANK_ACCOUNT_ID'",
    "source": "csv",
    "fileName": "test_2025_11.csv",
    "transactions": [
      {
        "transactionDate": "2025-11-18",
        "amount": 1050,
        "currency": "TWD",
        "description": "客戶付款",
        "referenceNo": "TXN001"
      },
      {
        "transactionDate": "2025-11-18",
        "amount": 2000,
        "currency": "TWD",
        "description": "訂單 order-test-123",
        "referenceNo": "TXN002"
      }
    ]
  }' | jq
```

**驗證點**:
- [ ] 回應 `success: true`
- [ ] 回應包含 `batchId`
- [ ] `recordCount` = 2
- [ ] 資料庫 `bank_import_batches` 新增一筆記錄
- [ ] 資料庫 `bank_transactions` 新增 2 筆記錄
- [ ] 所有交易 `reconcile_status` = "unmatched"
- [ ] 所有交易 `batch_id` 正確關聯

#### 步驟 3: 自動對帳
```bash
BATCH_ID="[從步驟2取得]"
curl -X POST http://localhost:3000/reconciliation/bank/auto-match/$BATCH_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dateTolerance": 1,
    "amountTolerance": 0,
    "useFuzzyMatch": true
  }' | jq
```

**驗證點**:
- [ ] 回應包含 `exactMatched`, `fuzzyMatched`, `unmatched` 計數
- [ ] 如果有訂單/付款匹配，`exactMatched` > 0
- [ ] 如果描述包含訂單號，`fuzzyMatched` > 0
- [ ] 資料庫 `reconciliation_results` 新增匹配記錄
- [ ] 匹配的交易 `reconcile_status` 更新為 "matched"

#### 步驟 4: 查詢待對帳項目
```bash
curl -X GET "http://localhost:3000/reconciliation/pending?entityId=$ENTITY_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq
```

**驗證點**:
- [ ] 回應包含未匹配的銀行交易
- [ ] 每筆交易包含 `bankAccount` 和 `importBatch` 關聯資料
- [ ] `reconcile_status` = "unmatched"

#### 步驟 5: 手動對帳
```bash
BANK_TX_ID="[從步驟4取得一筆未匹配交易]"
PAYMENT_ID="[從現有 payments 表取得]"

curl -X POST http://localhost:3000/reconciliation/bank/manual-match \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bankTransactionId": "'$BANK_TX_ID'",
    "matchedType": "payment",
    "matchedId": "'$PAYMENT_ID'"
  }' | jq
```

**驗證點**:
- [ ] 回應 `success: true`
- [ ] 資料庫 `reconciliation_results` 新增記錄
- [ ] `rule_used` = "manual"
- [ ] `confidence` = 100
- [ ] `bank_transactions.reconcile_status` 更新為 "matched"

#### 步驟 6: 取消對帳
```bash
curl -X POST http://localhost:3000/reconciliation/bank/unmatch \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bankTransactionId": "'$BANK_TX_ID'"}' | jq
```

**驗證點**:
- [ ] 回應 `success: true`
- [ ] 資料庫 `reconciliation_results` 記錄已刪除
- [ ] `bank_transactions.reconcile_status` 恢復為 "unmatched"
- [ ] `matched_type` 和 `matched_id` 設為 null

---

### 13️⃣ RBAC 權限驗收

**目標**: 驗證不同角色的存取權限

#### 測試情境 1: ADMIN 全權限
```bash
# 使用 ADMIN 角色 token
# 應可存取所有 Invoicing 和 Reconciliation endpoints
```

**驗證點**:
- [ ] 可預覽發票 ✅
- [ ] 可開立發票 ✅
- [ ] 可作廢發票 ✅
- [ ] 可匯入銀行交易 ✅
- [ ] 可自動對帳 ✅
- [ ] 可手動對帳 ✅

#### 測試情境 2: ACCOUNTANT 有限權限
```bash
# 使用 ACCOUNTANT 角色 token
```

**驗證點**:
- [ ] 可預覽發票 ✅
- [ ] 可開立發票 ✅
- [ ] 可作廢發票 ✅
- [ ] 可查詢待對帳項目 ✅
- [ ] 不可匯入銀行交易 ❌ (HTTP 403)
- [ ] 不可自動對帳 ❌ (HTTP 403)
- [ ] 不可手動對帳 ❌ (HTTP 403)

#### 測試情境 3: OPERATOR 受限權限
```bash
# 使用 OPERATOR 角色 token
```

**驗證點**:
- [ ] 不可存取 Invoicing endpoints ❌ (HTTP 403)
- [ ] 不可存取 Reconciliation endpoints ❌ (HTTP 403)

---

### 14️⃣ Migration 運作確認

**目標**: 驗證資料庫 Migration 可正確執行

```bash
cd /workspaces/ecom-accounting-system-/backend

# 檢查 migration 檔案
ls -la prisma/migrations/

# 檢查 schema
npx prisma validate

# 套用 migration
npx prisma migrate deploy
```

**驗證點**:
- [ ] Migration 檔案存在: `20251118190000_add_invoicing_and_reconciliation_tables/`
- [ ] `migration.sql` 包含 5 個 CREATE TABLE 語句
- [ ] Prisma schema 驗證通過（無錯誤）
- [ ] Migration 套用成功（無錯誤）
- [ ] 資料庫新增 5 個資料表:
  - [ ] `invoices`
  - [ ] `invoice_lines`
  - [ ] `invoice_logs`
  - [ ] `bank_import_batches`
  - [ ] `reconciliation_results`
- [ ] `bank_transactions` 新增 `batch_id` 欄位

---

## 📊 最終測試報告格式（更新版）

```
===========================================
電商會計系統 - 最終測試報告（第三版）
執行日期: YYYY-MM-DD HH:mm:ss
執行者: [姓名]
===========================================

【環境資訊】
- Node.js: v20.x.x
- PostgreSQL: 16.x
- OS: [Linux/macOS/Windows]

【基礎測試結果】
✅ Backend 編譯: PASS
✅ Frontend 編譯: PASS
✅ Database Migration: PASS (38 models, +5 new tables)
✅ Database Seed: PASS
✅ Backend 啟動: PASS (14 modules, +2 new)
✅ Frontend 啟動: PASS

【API 基礎測試】
✅ API Test 1 (Login): PASS
✅ API Test 2 (Accounts): PASS
✅ API Test 3 (Mock Order): PASS
✅ API Test 4 (Reports): PASS

【實戰流程驗收】
✅ 電子發票流程:
  - 預覽發票: PASS
  - 開立發票: PASS
  - 重複開立防護: PASS
  - 查詢狀態: PASS
  - 作廢發票: PASS
  - 資料庫記錄: PASS

✅ 銀行對帳流程:
  - 匯入交易: PASS (2 records)
  - 自動對帳: PASS (exact: 1, fuzzy: 1)
  - 查詢待對帳: PASS
  - 手動對帳: PASS
  - 取消對帳: PASS
  - 資料庫記錄: PASS

【RBAC 權限驗收】
✅ ADMIN 權限: PASS (全功能)
✅ ACCOUNTANT 權限: PASS (發票相關)
✅ OPERATOR 權限: PASS (受限)

【Migration 驗收】
✅ Schema 驗證: PASS
✅ Migration 套用: PASS
✅ 新增資料表: PASS (5 tables)
✅ 4 欄位金額標準: PASS

【單元測試】
✅ InvoicingService Tests: 3/3 PASS
✅ ReconciliationService Tests: 3/3 PASS

【總結】
✅ 所有測試項目通過 (34/34)
✅ 系統可正式上線使用 🎉

【備註】
第三版新增功能：
- 電子發票模組完整實作
- 銀行對帳模組完整實作
- RBAC 權限完整套用
- 6 個單元測試全數通過
===========================================
```

---

## 🚀 下一步行動

測試全部通過後:
1. ✅ 提交所有變更到 Git
2. ✅ 建立 Release Tag (v3.0.0)
3. ✅ 部署到 Render 或其他平台
4. ✅ 通知團隊成員系統可用

---

**✨ 祝測試順利！**

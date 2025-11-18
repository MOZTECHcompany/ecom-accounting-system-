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

## 🚀 下一步行動

測試全部通過後:
1. ✅ 提交所有變更到 Git
2. ✅ 建立 Release Tag
3. ✅ 部署到 Render 或其他平台
4. ✅ 通知團隊成員系統可用

---

**✨ 祝測試順利！**

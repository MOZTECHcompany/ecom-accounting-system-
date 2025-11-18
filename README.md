# 🏪 電商會計系統 (E-Commerce Accounting System)

[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-brightgreen.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

專為電商企業設計的完整會計/財務管理系統，支援多公司實體、多幣別、多銷售平台。

## 📋 目錄

- [系統特色](#-系統特色)
- [快速開始](#-快速開始)
  - [方式一：GitHub Codespaces（推薦）](#方式一github-codespaces推薦)
  - [方式二：本機開發](#方式二本機開發)
  - [方式三：完整 Docker Compose](#方式三完整-docker-compose)
- [預設帳號](#-預設帳號)
- [API 文件](#-api-文件)
- [專案結構](#️-專案結構)
- [資料庫 Schema](#-資料庫-schema)
- [RBAC 權限系統](#-rbac-權限系統)
- [種子資料](#-種子資料)
- [測試](#-測試)
- [部署到 Render](#-部署到-render)
- [開發指南](#️-開發指南)

## 🌟 系統特色

### 核心功能
- ✅ **多公司實體管理** - 支援跨國營運，每個實體獨立會計帳
- ✅ **多幣別支援** - 4欄位金額標準（原幣、幣別、匯率、本位幣）
- ✅ **多平台整合** - Shopify、momo、PChome、Shopee、Amazon 等9個平台
- ✅ **完整會計循環** - 分錄、過帳、試算、結帳、報表
- ✅ **RBAC權限控制** - ADMIN、ACCOUNTANT、OPERATOR 三層角色
- ✅ **審批流程** - 費用申請、薪資發放等需要審批
- ✅ **銀行對帳** - 自動匹配銀行交易與會計記錄

### 技術架構
- **Backend**: NestJS 11.x + TypeScript + Prisma ORM
- **Database**: PostgreSQL 16
- **Frontend**: React 18 + Vite + Ant Design + TypeScript
- **部署**: Docker Compose + GitHub Codespaces Ready

---

## 🚀 快速開始

### 方式一：GitHub Codespaces（推薦）

1. **開啟 Codespaces**
   - 在 GitHub 儲存庫頁面點擊 "Code" → "Codespaces" → "Create codespace on main"

2. **等待自動配置完成**
   - DevContainer 會自動啟動 PostgreSQL、Backend、Frontend
   - 自動執行 `npm install` 和 `prisma generate`

3. **執行 Migration 和 Seed**
   ```bash
   cd backend
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. **啟動服務**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run start:dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm run dev
   ```

5. **訪問系統**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000/api/v1`
   - Swagger文件: `http://localhost:3000/api-docs`

---

### 方式二：本機開發

#### 前置需求
- Node.js 20+
- PostgreSQL 16
- Docker Desktop（可選）

#### 1. 啟動資料庫

**選項 A：使用 Docker**
```bash
docker-compose up postgres -d
```

**選項 B：本機 PostgreSQL**
```bash
# 建立資料庫
createdb ecommerce_accounting
```

#### 2. Backend 設定

```bash
cd backend

# 安裝依賴
npm install

# 複製環境變數
cp .env.example .env

# 編輯 .env，確認 DATABASE_URL
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce_accounting?schema=public"

# 產生 Prisma Client
npm run prisma:generate

# 執行 Migration
npm run prisma:migrate

# 載入種子資料
npm run prisma:seed

# 啟動 Backend
npm run start:dev
```

#### 3. Frontend 設定

```bash
cd frontend

# 安裝依賴
npm install

# 啟動 Frontend
npm run dev
```

#### 4. 訪問系統
- Frontend: http://localhost:5173
- Backend: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api-docs

---

### 方式三：完整 Docker Compose

```bash
# 啟動所有服務（PostgreSQL + Backend + Frontend）
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止所有服務
docker-compose down
```

訪問：
- Frontend: http://localhost:3001
- Backend: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api-docs

---

## 👤 預設帳號

系統種子資料會自動建立以下帳號：

| 角色 | Email | 密碼 | 權限 |
|------|-------|------|------|
| 系統管理員 | `admin@example.com` | `Admin@123456` | 所有權限 |

---

## 📚 API 文件

### Swagger UI
啟動 Backend 後訪問：`http://localhost:3000/api-docs`

**所有 API 已使用 Swagger 註解完整標註：**
- ✅ 所有 Controllers 都有 `@ApiTags` 分類
- ✅ 所有端點都有 `@ApiOperation` 說明
- ✅ 查詢參數使用 `@ApiQuery` 標註
- ✅ 請求體使用 `@ApiBody` 標註
- ✅ 回應格式使用 `@ApiResponse` 標註

### 範例 API 測試

#### 1. 登入取得 Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123456"
  }'
```

回應：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "系統管理員"
  }
}
```

#### 2. 查詢會計科目
```bash
curl -X GET "http://localhost:3000/api/v1/accounting/accounts?entityId=tw-entity-001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. 建立模擬訂單（測試用）
```bash
curl -X POST "http://localhost:3000/api/v1/sales/orders/mock?entityId=tw-entity-001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. 取得損益表
```bash
curl -X GET "http://localhost:3000/api/v1/reports/income-statement?entityId=tw-entity-001&startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🗂️ 專案結構

```
ecom-accounting-system/
├── backend/                    # NestJS 後端
│   ├── prisma/
│   │   ├── schema.prisma      # 資料庫 Schema（36個 Models）
│   │   ├── migrations/        # Migration 歷史
│   │   └── seed.ts            # 種子資料
│   ├── src/
│   │   ├── common/            # 共用模組（Guards、Decorators、Prisma）
│   │   └── modules/           # 業務模組（12個）
│   │       ├── auth/          # 認證授權
│   │       ├── users/         # 使用者管理
│   │       ├── entities/      # 實體管理
│   │       ├── accounting/    # 會計核心
│   │       ├── sales/         # 銷售管理
│   │       ├── ar/            # 應收帳款
│   │       ├── ap/            # 應付帳款
│   │       ├── expense/       # 費用管理
│   │       ├── cost/          # 成本管理
│   │       ├── banking/       # 銀行對帳
│   │       ├── payroll/       # 薪資管理
│   │       ├── approvals/     # 審批流程
│   │       └── reports/       # 財務報表
│   └── Dockerfile
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/        # UI 元件
│   │   ├── contexts/          # Context (AuthContext)
│   │   ├── pages/             # 頁面 (Login, Accounts)
│   │   ├── services/          # API Services
│   │   └── App.tsx
│   └── package.json
├── .devcontainer/              # DevContainer 配置
│   └── devcontainer.json
├── docker-compose.yml          # Docker Compose 配置
├── .env.example                # 環境變數範例
└── README.md
```

---

## 🧩 資料庫 Schema

### 核心資料表（36個）

#### 系統核心
- `users` - 使用者
- `roles` - 角色（ADMIN、ACCOUNTANT、OPERATOR）
- `permissions` - 權限
- `user_roles` - 使用者角色關聯
- `role_permissions` - 角色權限關聯
- `audit_logs` - 審計軌跡

#### 會計核心
- `entities` - 公司實體
- `accounts` - 會計科目表
- `periods` - 會計期間
- `journal_entries` - 會計分錄主檔
- `journal_lines` - 會計分錄明細

#### 銷售模組
- `sales_channels` - 銷售渠道（9個平台）
- `customers` - 客戶
- `vendors` - 供應商
- `products` - 商品
- `sales_orders` - 銷售訂單
- `sales_order_items` - 訂單明細
- `shipments` - 出貨記錄
- `payments` - 付款記錄

#### AR/AP
- `ar_invoices` - 應收發票
- `ap_invoices` - 應付發票

#### 費用與審批
- `expense_requests` - 費用申請
- `expenses` - 費用記錄
- `expense_items` - 費用明細
- `approval_requests` - 審批請求

#### 成本管理
- `purchase_orders` - 採購訂單
- `purchase_order_items` - 採購明細
- `product_batches` - 產品批次（成本追蹤）
- `dev_costs` - 研發成本

#### 銀行模組
- `bank_accounts` - 銀行帳戶
- `virtual_accounts` - 虛擬帳號
- `bank_transactions` - 銀行交易

#### 薪資模組
- `departments` - 部門
- `employees` - 員工
- `payroll_runs` - 薪資批次
- `payroll_items` - 薪資明細

### 金額欄位標準

**所有金額欄位都採用 4 欄位標準：**
```typescript
amountOriginal  Decimal  // 原幣金額
currency        String   // 幣別 (TWD, USD, CNY...)
fxRate          Decimal  // 匯率
amountBase      Decimal  // 本位幣金額
```

---

## 🔐 RBAC 權限系統

### 角色定義

| 角色 | 代碼 | 權限範圍 |
|------|------|----------|
| 系統管理員 | `ADMIN` | 所有權限，包含使用者管理、系統設定 |
| 會計人員 | `ACCOUNTANT` | 查看、建立、審核會計相關資料 |
| 操作員 | `OPERATOR` | 查看、建立訂單等基本操作 |

### 使用方式

在 Controller 中使用 `@Roles()` decorator：
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ACCOUNTANT')
@Get('sensitive-data')
async getSensitiveData() {
  // 只有 ADMIN 和 ACCOUNTANT 可以訪問
}
```

---

## 📊 種子資料

執行 `npm run prisma:seed` 會建立：

- ✅ **2個實體**：台灣公司（TWD）、大陸公司（CNY）
- ✅ **3個角色**：ADMIN、ACCOUNTANT、OPERATOR
- ✅ **1個管理員**：admin@example.com
- ✅ **64個會計科目**：完整 IFRS + 台灣常用科目表
- ✅ **9個銷售渠道**：
  - SHOPIFY - Shopify 官網
  - 1SHOP - 1shop 團購
  - SHOPLINE - SHOPLINE
  - MOMO - momo 購物
  - PCHOME - PChome 商店街
  - SHOPEE - Shopee 蝦皮
  - COUPANG - Coupang
  - AMAZON - Amazon
  - TTSHOP - TikTok Shop
- ✅ **24個會計期間**：2025年度 12個月 × 2個實體

---

## 🧪 測試

### Backend 測試
```bash
cd backend

# 單元測試
npm run test

# E2E 測試
npm run test:e2e

# 測試覆蓋率
npm run test:cov
```

### Frontend 測試
```bash
cd frontend

# 單元測試
npm run test

# E2E 測試（使用 Playwright）
npm run test:e2e
```

---

## 🚢 部署到 Render

### 正式環境 URL
- **前端**: https://ecom-accounting-frontend.onrender.com
- **後端**: https://ecom-accounting-backend.onrender.com
- **API Base URL**: https://ecom-accounting-backend.onrender.com/api/v1
- **Swagger 文件**: https://ecom-accounting-backend.onrender.com/api-docs

### 1. 準備工作
- 註冊 [Render](https://render.com) 帳號
- Fork 此專案到您的 GitHub

### 2. 建立 PostgreSQL 資料庫
1. 在 Render Dashboard 點擊 "New" → "PostgreSQL"
2. 填寫資料庫名稱：`ecommerce-accounting-db`
3. 選擇免費方案
4. 點擊 "Create Database"
5. 複製 "Internal Database URL"

### 3. 建立 Backend Web Service
1. 點擊 "New" → "Web Service"
2. 連接您的 GitHub 儲存庫
3. 設定：
   - **Name**: `ecom-accounting-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`
4. 環境變數：
   ```bash
   DATABASE_URL=<您的 Internal Database URL>
   JWT_SECRET=<隨機產生的安全字串，至少32字元>
   NODE_ENV=production
   PORT=3000
   API_PREFIX=/api/v1
   ```
5. 點擊 "Create Web Service"
6. 部署完成後，複製您的 Backend URL（例如：`https://ecom-accounting-backend.onrender.com`）

### 4. 建立 Frontend Web Service
1. 點擊 "New" → "Static Site"
2. 連接相同的儲存庫
3. 設定：
   - **Name**: `ecom-accounting-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **重要：環境變數設定**
   ```bash
   # 必須指向您的 Backend URL（步驟3取得的URL）
   VITE_API_URL=https://ecom-accounting-backend.onrender.com/api/v1
   ```
   ⚠️ **注意**：請將上方 URL 替換為您實際的 Backend URL
5. 點擊 "Create Static Site"

### 5. 初始化資料
Backend 部署完成後，執行種子資料：
```bash
# 在 Render Shell 中執行
npm run prisma:seed
```

### 6. 驗證部署

#### 檢查 Backend Health
```bash
curl https://ecom-accounting-backend.onrender.com/health
# 預期回應：{"status":"ok","timestamp":"...","env":"production"}
```

#### 檢查 Swagger 文件
開啟瀏覽器訪問：
```
https://ecom-accounting-backend.onrender.com/api-docs
```

#### 測試登入 API
```bash
curl -X POST https://ecom-accounting-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123456"
  }'
```

#### 測試前端訪問
開啟瀏覽器：
```
https://ecom-accounting-frontend.onrender.com
```

---

## 🛠️ 開發指南

### 新增模組

1. **建立模組檔案**
   ```bash
   cd backend/src/modules
   mkdir my-module
   cd my-module
   touch my-module.controller.ts my-module.service.ts my-module.repository.ts my-module.module.ts
   mkdir dto schemas
   ```

2. **檔案結構**
   ```
   my-module/
   ├── my-module.controller.ts    # API 端點
   ├── my-module.service.ts       # 業務邏輯
   ├── my-module.repository.ts    # 資料存取層
   ├── my-module.module.ts        # 模組定義
   ├── dto/                       # 資料傳輸物件
   └── schemas/                   # 驗證 schemas
   ```

3. **註冊到 AppModule**
   ```typescript
   // app.module.ts
   import { MyModule } from './modules/my-module/my-module.module';
   
   @Module({
     imports: [
       // ...其他模組
       MyModule,
     ],
   })
   ```

### Prisma 資料庫管理

```bash
# 產生 Prisma Client
npm run prisma:generate

# 建立新 Migration
npm run prisma:migrate

# 套用 Migration（生產環境）
npm run prisma:deploy

# 執行種子資料
npm run prisma:seed

# 開啟 Prisma Studio（資料庫 GUI）
npm run prisma:studio

# 重置資料庫（開發環境）
npx prisma migrate reset
```

### 程式碼風格

```bash
# Lint 檢查
npm run lint

# 自動修復
npm run lint:fix

# 格式化程式碼
npm run format
```

---

## 📌 實戰流程示例

### 流程 A：訂單 → 收款 → 發票

完整的電子發票開立流程：

#### 1. 建立銷售訂單
```bash
curl -X POST http://localhost:3000/sales/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "entity-uuid",
    "channelId": "channel-uuid",
    "customerId": "customer-uuid",
    "orderDate": "2025-11-18",
    "totalGrossOriginal": 1050,
    "totalGrossCurrency": "TWD",
    "items": [
      {
        "productId": "product-uuid",
        "qty": 2,
        "unitPriceOriginal": 500,
        "unitPriceCurrency": "TWD"
      }
    ]
  }'
```

#### 2. 預覽發票內容
```bash
curl -X GET http://localhost:3000/invoicing/preview/ORDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**預期回應**：
```json
{
  "orderId": "order-uuid",
  "invoiceType": "B2C",
  "currency": "TWD",
  "amountOriginal": "1000.00",
  "taxAmountOriginal": "50.00",
  "totalAmountOriginal": "1050.00",
  "estimatedInvoiceNumber": "AA12345678",
  "invoiceLines": [...]
}
```

#### 3. 開立正式發票
```bash
curl -X POST http://localhost:3000/invoicing/issue/ORDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceType": "B2C",
    "buyerName": "測試客戶",
    "buyerEmail": "customer@example.com"
  }'
```

**預期回應**：
```json
{
  "success": true,
  "invoiceId": "invoice-uuid",
  "invoiceNumber": "AA12345678",
  "totalAmount": "1050.00"
}
```

#### 4. 查詢發票狀態
```bash
curl -X GET http://localhost:3000/invoicing/by-order/ORDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 5. 作廢發票（如需要）
```bash
curl -X POST http://localhost:3000/invoicing/INVOICE_ID/void \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "客戶要求取消訂單"
  }'
```

---

### 流程 B：匯入銀行 → 自動對帳

完整的銀行對帳流程：

#### 1. 匯入銀行交易明細
```bash
curl -X POST http://localhost:3000/reconciliation/bank/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "entity-uuid",
    "bankAccountId": "bank-account-uuid",
    "source": "csv",
    "fileName": "bank_statement_2025_11.csv",
    "transactions": [
      {
        "transactionDate": "2025-11-18",
        "amount": 1050,
        "currency": "TWD",
        "description": "訂單付款 order-abc-123",
        "referenceNo": "TXN20251118001",
        "virtualAccount": "886123456"
      },
      {
        "transactionDate": "2025-11-18",
        "amount": 2000,
        "currency": "TWD",
        "description": "客戶付款",
        "referenceNo": "TXN20251118002"
      }
    ]
  }'
```

**預期回應**：
```json
{
  "success": true,
  "batchId": "batch-uuid-123",
  "recordCount": 2
}
```

#### 2. 自動對帳
```bash
curl -X POST http://localhost:3000/reconciliation/bank/auto-match/BATCH_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dateTolerance": 1,
    "amountTolerance": 0,
    "useFuzzyMatch": true
  }'
```

**預期回應**：
```json
{
  "success": true,
  "totalTransactions": 2,
  "exactMatched": 1,
  "fuzzyMatched": 1,
  "unmatched": 0
}
```

#### 3. 查詢待對帳項目
```bash
curl -X GET "http://localhost:3000/reconciliation/pending?entityId=ENTITY_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**預期回應**：
```json
[
  {
    "id": "bank-tx-uuid",
    "txnDate": "2025-11-18",
    "amountOriginal": "999.00",
    "descriptionRaw": "未知來源",
    "reconcileStatus": "unmatched"
  }
]
```

#### 4. 手動對帳（針對無法自動匹配的項目）
```bash
curl -X POST http://localhost:3000/reconciliation/bank/manual-match \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bankTransactionId": "bank-tx-uuid",
    "matchedType": "payment",
    "matchedId": "payment-uuid"
  }'
```

#### 5. 取消對帳（如有誤）
```bash
curl -X POST http://localhost:3000/reconciliation/bank/unmatch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bankTransactionId": "bank-tx-uuid"
  }'
```

---

## 🤝 貢獻指南

1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

---


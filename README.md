# 電商會計系統 (E-Commerce Accounting System)

[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-brightgreen.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

專為電商設計的全功能會計與財務管理系統,支援多公司實體、多幣別、多銷售平台的綜合管理。

## 📋 目錄

- [系統特色](#系統特色)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [資料庫架構](#資料庫架構)
- [API 文件](#api-文件)
- [開發指南](#開發指南)
- [部署說明](#部署說明)
- [擴充計畫](#擴充計畫)

## 🌟 系統特色

### 核心功能

- **多公司實體管理**：支援台灣、大陸等多個營運主體,各自獨立的會計科目與報表
- **多幣別支援**:自動匯率轉換,支援 TWD、CNY、USD 等多種貨幣
- **多銷售平台整合**:
  - 官網:Shopify、SHOPLINE、1shop
  - 電商平台:momo、PChome、Shopee、Coupang
  - 國際平台:Amazon、TikTok Shop
- **完整會計系統**:
  - 會計科目表(Chart of Accounts)
  - 自動化會計分錄產生
  - 借貸平衡驗證
  - 會計期間管理與鎖帳機制
  - 四大財務報表(損益表、資產負債表、現金流量表、權益變動表)
- **應收應付管理**:
  - AR 齡別分析
  - 呆帳備抵與壞帳處理
  - AP 到期提醒系統
  - 費用申請與審核流程
- **銀行對帳**:
  - 虛擬帳號支援
  - 自動對帳匹配
  - 異常交易標記
- **人事薪資**:
  - 台灣與大陸薪資結構
  - 勞健保計算
  - 薪資分錄自動化
- **成本管理**:
  - 批次成本追蹤
  - 開發成本攤提(模具費、檢驗費)
  - 銷貨成本自動計算

### 系統設計亮點

✅ **以會計分錄為核心**:所有交易最終都會產生會計分錄,確保資料一致性  
✅ **模組化架構**:清晰的領域模組劃分,易於維護與擴充  
✅ **權限管理**:RBAC 角色權限控制,支援多層級審核  
✅ **審計軌跡**:完整的操作記錄,符合稽核需求  
✅ **型別安全**:TypeScript + Prisma 提供完整的型別檢查

## 🏗️ 技術架構

```
技術棧:
├── 後端框架:NestJS 11.x
├── 程式語言:TypeScript 5.7
├── ORM:Prisma 6.x
├── 資料庫:PostgreSQL 16
├── 認證:JWT + Passport
├── API 文件:Swagger/OpenAPI
├── 測試:Jest
└── 容器化:Docker + Docker Compose
```

### 專案結構

```
backend/
├── prisma/
│   ├── schema.prisma          # Prisma 資料模型定義
│   ├── seed.ts                # 資料庫初始化腳本
│   └── migrations/            # 資料庫遷移記錄
├── src/
│   ├── common/                # 共用模組
│   │   ├── config/            # 環境設定
│   │   ├── prisma/            # Prisma 服務
│   │   ├── guards/            # 守衛(認證、權限)
│   │   └── decorators/        # 自訂裝飾器
│   ├── modules/               # 業務模組
│   │   ├── auth/              # 認證模組
│   │   ├── users/             # 使用者管理
│   │   ├── accounting/        # 會計核心
│   │   │   ├── services/
│   │   │   │   ├── journal.service.ts    # 分錄服務
│   │   │   │   └── report.service.ts     # 報表服務
│   │   │   ├── accounting.controller.ts
│   │   │   └── accounting.service.ts
│   │   ├── sales/             # 銷售管理
│   │   │   ├── services/
│   │   │   │   └── sales-order.service.ts
│   │   │   └── sales.controller.ts
│   │   ├── purchase/          # 進貨管理(待實作)
│   │   ├── hr/                # 人事薪資(待實作)
│   │   └── banking/           # 銀行對帳(待實作)
│   ├── app.module.ts          # 根模組
│   └── main.ts                # 應用程式入口
├── .env.example               # 環境變數範本
├── docker-compose.yml         # Docker Compose 設定
├── Dockerfile                 # Docker 映像檔設定
└── package.json               # npm 套件管理
```

## 🚀 快速開始

### 環境需求

- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose(可選)

### 方法 1:本機開發

```bash
# 1. 進入專案目錄
cd backend

# 2. 安裝相依套件
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 檔案,設定資料庫連線等參數

# 4. 啟動 PostgreSQL(如果本機沒有)
# 可以使用 Docker
docker run -d \
  --name ecom-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ecommerce_accounting \
  -p 5432:5432 \
  postgres:16-alpine

# 5. 執行資料庫遷移
npm run prisma:migrate

# 6. 執行資料初始化(Seeding)
npm run prisma:seed

# 7. 啟動開發伺服器
npm run start:dev
```

### 方法 2:使用 Docker Compose

```bash
# 1. 進入專案目錄
cd backend

# 2. 使用 Docker Compose 啟動所有服務
docker-compose up -d

# 服務會自動:
# - 啟動 PostgreSQL
# - 執行資料庫遷移
# - 執行資料初始化
# - 啟動 NestJS 後端服務
```

### 方法 3:GitHub Codespaces(推薦)

1. 在 GitHub 上開啟此專案
2. 點選 `Code` → `Codespaces` → `Create codespace on main`
3. Codespaces 會自動:
   - 載入 DevContainer 環境
   - 安裝所有相依套件
   - 啟動 PostgreSQL
   - 執行 migration 與 seeding
   - 啟動開發伺服器

**存取應用程式:**

- API 端點:`http://localhost:3000/api/v1`
- Swagger 文件:`http://localhost:3000/api-docs`

**預設管理員帳號:**

```
Email: admin@example.com
Password: Admin@123456
```

## 🗄️ 資料庫架構

### 核心資料表

#### 1. 系統核心
- `users` - 使用者
- `roles` - 角色
- `permissions` - 權限
- `user_roles` - 使用者角色關聯
- `role_permissions` - 角色權限關聯
- `audit_logs` - 審計日誌

#### 2. 會計核心
- `entities` - 公司實體
- `accounts` - 會計科目表
- `periods` - 會計期間
- `journal_entries` - 會計分錄主檔
- `journal_lines` - 會計分錄明細

#### 3. 銷售管理
- `sales_channels` - 銷售渠道
- `customers` - 客戶
- `products` - 商品
- `sales_orders` - 銷售訂單
- `sales_order_items` - 訂單明細
- `shipments` - 出貨記錄
- `payments` - 收款記錄

#### 4. 應收應付
- `ar_invoices` - 應收帳款
- `ap_invoices` - 應付帳款
- `expense_requests` - 費用申請單
- `expenses` - 費用記錄
- `approval_requests` - 審核流程

#### 5. 進貨成本
- `vendors` - 供應商
- `purchase_orders` - 進貨訂單
- `product_batches` - 進貨批次
- `dev_costs` - 開發成本

#### 6. 銀行管理
- `bank_accounts` - 銀行帳戶
- `virtual_accounts` - 虛擬帳號
- `bank_transactions` - 銀行交易流水

#### 7. 人事薪資
- `departments` - 部門
- `employees` - 員工
- `payroll_runs` - 薪資批次
- `payroll_items` - 薪資明細

### ERD 重點說明

- **多公司實體隔離**:幾乎所有表都有 `entity_id` 欄位
- **多幣別支援**:金額欄位包含 `currency`、`fx_rate`、`amount_base`
- **來源追蹤**:重要交易表都有 `source_module` 和 `source_id`
- **審計追蹤**:關鍵操作記錄在 `audit_logs`

## 📚 API 文件

啟動服務後,造訪 Swagger 文件:

**本機開發:** `http://localhost:3000/api-docs`

### 主要 API 端點

#### 認證 (`/api/v1/auth`)
- `POST /auth/register` - 使用者註冊
- `POST /auth/login` - 使用者登入

#### 使用者 (`/api/v1/users`)
- `GET /users/me` - 取得當前使用者資訊
- `GET /users/me/permissions` - 取得當前使用者權限

#### 會計 (`/api/v1/accounting`)
- `GET /accounting/accounts` - 查詢會計科目表
- `GET /accounting/periods` - 查詢會計期間
- `GET /accounting/reports/income-statement` - 產生損益表
- `GET /accounting/reports/balance-sheet` - 產生資產負債表

#### 銷售 (`/api/v1/sales`)
- `GET /sales/channels` - 查詢銷售渠道
- `GET /sales/orders` - 查詢銷售訂單
- `POST /sales/orders` - 建立銷售訂單
- `POST /sales/orders/:id/complete` - 完成訂單(產生會計分錄)

### 認證方式

大部分 API 都需要 JWT Token 認證:

```bash
# 1. 登入取得 Token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123456"}'

# 回應:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": { ... }
# }

# 2. 使用 Token 存取受保護的 API
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🛠️ 開發指南

### 常用指令

```bash
# 開發
npm run start:dev           # 啟動開發伺服器(熱重載)
npm run build               # 建置專案
npm run start:prod          # 生產環境啟動

# 測試
npm run test                # 執行單元測試
npm run test:watch          # 測試監視模式
npm run test:cov            # 測試覆蓋率報告
npm run test:e2e            # 執行端對端測試

# Prisma
npm run prisma:generate     # 產生 Prisma Client
npm run prisma:migrate      # 執行資料庫遷移
npm run prisma:seed         # 執行資料初始化
npm run prisma:studio       # 開啟 Prisma Studio(資料庫 GUI)

# 程式碼品質
npm run lint                # ESLint 檢查
npm run format              # Prettier 格式化
```

### 新增模組範例

```bash
# 使用 NestJS CLI 產生新模組
nest g module modules/purchase
nest g service modules/purchase
nest g controller modules/purchase

# 產生 DTO
nest g class modules/purchase/dto/create-purchase-order.dto --no-spec
```

### 資料庫 Migration

```bash
# 1. 修改 prisma/schema.prisma

# 2. 建立 migration
npx prisma migrate dev --name add_new_table

# 3. 應用 migration(生產環境)
npx prisma migrate deploy
```

### 新增會計分錄邏輯

所有產生會計分錄的邏輯都應該呼叫 `JournalService.createJournalEntry()`:

```typescript
// 範例:在銷售訂單完成時產生收入分錄
import { JournalService } from '../accounting/services/journal.service';

async completeSalesOrder(orderId: string, userId: string) {
  const order = await this.prisma.salesOrder.findUnique({ 
    where: { id: orderId } 
  });

  // 產生會計分錄
  await this.journalService.createJournalEntry({
    entityId: order.entityId,
    date: new Date(),
    description: `銷售訂單 ${order.externalOrderId}`,
    sourceModule: 'sales',
    sourceId: order.id,
    createdBy: userId,
    lines: [
      {
        accountId: arAccountId,
        debit: totalAmount,
        credit: 0,
        currency: order.currency,
        fxRate: order.fxRate,
        amountBase: totalAmount * order.fxRate,
        memo: '應收銷貨款',
      },
      {
        accountId: revenueAccountId,
        debit: 0,
        credit: totalAmount,
        currency: order.currency,
        fxRate: order.fxRate,
        amountBase: totalAmount * order.fxRate,
        memo: '銷貨收入',
      },
    ],
  });
}
```

## 🚀 部署說明

### Render 部署

1. **準備工作**

   在 Render Dashboard 建立:
   - PostgreSQL 資料庫
   - Web Service

2. **設定環境變數**

   在 Render Web Service 設定以下環境變數:

   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   JWT_SECRET=your-production-secret-key
   JWT_EXPIRES_IN=7d
   PORT=3000
   NODE_ENV=production
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **建置與啟動指令**

   - **Build Command:** `cd backend && npm install && npx prisma generate && npm run build`
   - **Start Command:** `cd backend && npx prisma migrate deploy && npm run start:prod`

4. **自動部署**

   推送到 GitHub 後,Render 會自動偵測並部署

### Docker 部署

```bash
# 1. 建置映像檔
docker build -t ecom-accounting:latest ./backend

# 2. 執行容器
docker run -d \
  --name ecom-accounting \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  -p 3000:3000 \
  ecom-accounting:latest

# 3. 執行 migration
docker exec ecom-accounting npx prisma migrate deploy
```

### 環境變數說明

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 簽章密鑰 | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | JWT 過期時間 | `7d` |
| `PORT` | 服務埠號 | `3000` |
| `NODE_ENV` | 執行環境 | `development` / `production` |
| `CORS_ORIGIN` | CORS 允許來源 | `*` 或 `https://yourdomain.com` |
| `API_PREFIX` | API 路徑前綴 | `/api/v1` |
| `SWAGGER_ENABLED` | 是否啟用 Swagger | `true` / `false` |

## 📈 擴充計畫

以下模組骨架已建立,可由 Copilot 或開發者進一步實作:

### 近期擴充

- [ ] **進貨模組 (Purchase)**:完整的進貨訂單、驗收、成本分錄流程
- [ ] **人事模組 (HR)**:完整的薪資計算、勞健保、年度結算
- [ ] **銀行模組 (Banking)**:CSV 匯入、自動對帳、虛擬帳號管理
- [ ] **應收催收**:逾期提醒、催收流程、呆帳處理
- [ ] **應付付款**:批次付款、付款排程、審核流程
- [ ] **KOL 分潤**:佣金計算、對帳單產生

### 進階功能

- [ ] **預算管理**:年度預算設定、預算執行分析
- [ ] **成本中心**:多維度成本分攤
- [ ] **專案會計**:專案成本追蹤與損益分析
- [ ] **多層級審核**:可設定的審核流程引擎
- [ ] **自動化規則**:條件式分錄產生規則
- [ ] **報表訂閱**:定期自動寄送報表
- [ ] **儀表板**:視覺化財務儀表板
- [ ] **整合外部 API**:自動同步平台訂單、銀行交易

### 技術優化

- [ ] **快取機制**:Redis 快取熱門查詢
- [ ] **佇列處理**:Bull Queue 處理大量分錄
- [ ] **全文搜尋**:Elasticsearch 整合
- [ ] **檔案上傳**:支援附件上傳(S3)
- [ ] **匯出功能**:Excel、PDF 報表匯出
- [ ] **國際化**:多語系支援

## 📝 授權

此專案僅供學習與參考使用。

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request!

## 📧 聯絡方式

如有任何問題,請透過 GitHub Issues 聯繫。

---

**建議使用 GitHub Copilot 搭配此專案進行後續開發!**

此專案已完整註解所有模組與方法,Copilot 可以根據註解與架構快速實作剩餘功能。

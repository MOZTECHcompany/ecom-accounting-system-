# 🧾 Backend — NestJS + Prisma + AI Classifier

E-Commerce Accounting System 的後端採用 NestJS 11、Prisma 6 與 PostgreSQL 16，負責多實體財務資料、審批流程與 AI 報銷建議等核心邏輯。

## 功能亮點
- 多實體、多幣別會計帳務，所有金額欄位遵循四欄位標準（原幣／幣別／匯率／本位幣）。
- 完整費用申請流程：申請、審核、核銷、付款，並含歷程追蹤與通知。
- AI 智能建議：`AccountingClassifierService` 利用 Gemini 2.0 Flash + 關鍵字規則輸出 `suggestedItemId`、`suggestedAccountId`、`suggestionConfidence`，並透過 `AccountingClassifierFeedback` 建立迴饋閉環。
- Prisma 做為資料存取層，所有關聯皆具名並支援 `onDelete` 策略，利於審計與報表生成。

## 快速開始
```bash
cd backend
npm install

# 確認根目錄 .env (可由 .env.example 複製) 已設定 DATABASE_URL / JWT_SECRET / GEMINI_API_KEY 等變數

npm run prisma:migrate   # 建立/更新資料表
npm run prisma:seed      # 建立實體、會計科目、預設帳號
npm run start:dev        # 啟動 API，預設 http://localhost:3000/api/v1
```

## 主要指令
- `npm run prisma:generate`：重新產生 Prisma Client。
- `npm run prisma:migrate`：以 `prisma/migrations` 更新開發資料庫。
- `npm run prisma:deploy`：在正式環境套用 migration。
- `npm run prisma:seed`：載入系統預設資料。
- `npm run seed:ai-items`：使用 Gemini 生成 30~50 個標準 `ReimbursementItem`（預設 `tw-entity-001`）。
- `npm run test` / `npm run test:e2e`：單元與 E2E 測試。

## ERP 庫存匯入（Excel）
系統提供一次性匯入腳本，把舊 ERP 的「商品 + 倉庫 + 庫存數量 +（可選）序號/SN」灌進本系統的 `Product`/`Warehouse`/`InventorySnapshot`/`InventoryTransaction`/`InventorySerialNumber`。

指令：
```bash
# Dry-run（只印 summary、不寫入 DB）
npm run import:erp-inventory -- --file <你的檔案.xlsx> --entityId tw-entity-001 --dry-run

# 實際寫入
npm run import:erp-inventory -- --file <你的檔案.xlsx> --entityId tw-entity-001

# 若同檔名已匯入過（防止重複灌數），可加 --force 強制重跑
npm run import:erp-inventory -- --file <你的檔案.xlsx> --entityId tw-entity-001 --force

# 指定工作表
npm run import:erp-inventory -- --file <你的檔案.xlsx> --sheet <SheetName> --entityId tw-entity-001
```

欄位支援（擇一即可）：
- 條碼：`品項編碼` / `國際條碼` / `Barcode`
- 名稱：`品項名稱` / `品名` / `商品名稱`
- 倉庫：優先吃 `倉庫工廠編碼` + `倉庫工廠名稱`；若只有 `工業店`（或 `倉庫位置`）也可（會同時當作 code+name）
- 數量：`庫存數量` / `數量`（若有 SN 但數量空白，會自動視為 1）
- SN：`序號/批號` / `SN`

如果你目前的 VS Code dev container 沒有 Node.js，可用根目錄的 `docker-compose.yml` 先把 backend/postgres 跑起來，再在 backend 容器內執行：
```bash
docker compose up -d postgres backend
docker compose exec backend npm run import:erp-inventory -- --file /app/<你的檔案.xlsx> --entityId tw-entity-001 --dry-run
```

## 必填環境變數
| 變數 | 說明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 連線字串，務必指定 schema=public。|
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Auth 模組使用的 JWT 設定。|
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | 種子資料將建立的初始管理者。|
| `GEMINI_API_KEY` | Google Generative Language API 金鑰，供 AI 報銷建議與題庫生成。|
| `PORT`, `API_PREFIX`, `CORS_ORIGIN` | API 服務埠、前綴與允許的前端來源。|

## AI/Expense API 一覽
| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `POST` | `/api/v1/expense/predict-category` | 依描述輸出建議的 `ReimbursementItem` 與信心值，可供前端快速預先填入。|
| `POST` | `/api/v1/expense/requests/:id/feedback` | 審核者/申請者提交回饋，寫入 `accounting_classifier_feedbacks`。|
| `POST` | `/api/v1/expense/seed-ai-items` | （需授權）使用 Gemini 建立報銷項目題庫，僅建議於管理端操作。|
| `GET` | `/api/v1/expense/test-ai-connection` | 檢測 `GEMINI_API_KEY` 與 Gemini API 是否可用。|

快速測試（需 Bearer Token）：
```bash
curl -X POST http://localhost:3000/api/v1/expense/predict-category \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"tw-entity-001","description":"支付 Facebook 廣告費"}'
```

## 模組結構
```
src/modules
├── accounting         # 會計科目、分錄
├── expense            # 費用申請、AI 建議、Feedback
├── ap / ar            # 應付／應收
├── banking            # 銀行帳務
├── payroll            # 薪資與員工
├── vendor / sales     # 供應商與電商管道
└── notification       # 系統通知
```

`expense` 模組內含：
- `expense.service.ts`：封裝費用流程、AI 推論與 `AccountingClassifierFeedback` 寫入。
- `expense.controller.ts`：對外公開請款、審核、預測、回饋與題庫相關 API。
- `accounting-classifier.service.ts`：Gemini 推論、關鍵字規則、Few-shot 訓練資料建檔。
- `dto/submit-feedback.dto.ts`：統一回饋 payload，包含 `label`, `description`, `finalAccountId` 等欄位。

## Prisma 與資料庫
- Schema 位置：`prisma/schema.prisma`，所有 relation 均含 `@@index` 以利查詢。
- `accounting_classifier_feedbacks` 現已包含 `entity_id`, `description`, `suggested_item_id`, `chosen_item_id`，可串接 BI 或模型訓練。
- `prisma/seed.ts` 提供實體、會計科目、部門、使用者與示範訂單。
- `prisma/migrations/` 保留所有歷史 migration，請勿手動刪除或重設於共享環境。

## 測試與品質
```bash
npm run lint           # ESLint + Prettier
npm run test           # 單元測試
npm run test:e2e       # E2E 測試 (Jest + Supertest)
npm run test:cov       # 覆蓋率報告
```

## 疑難排解
- `PrismaClientKnownRequestError P2002`：代表種子資料重複，請清空資料庫或調整 unique 欄位。
- `GEMINI_API_KEY is not configured`：執行 AI 相關 API 前必須設定環境變數，可用 `GET /expense/test-ai-connection` 驗證。
- `filter of undefined` 前端錯誤通常由 API 回傳 null 值導致，已在 controller 層加上 guard，如仍遇見請檢查前端 service 是否對新的欄位做 null 檢查。

## 相關連結
- Swagger：`http://localhost:3000/api-docs`
- Prisma Studio：`npm run prisma:studio`
- AI 題庫腳本：`src/scripts/seed-ai-reimbursement-items.ts`

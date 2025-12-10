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
  - [商業面亮點](#商業面亮點)
  - [技術架構](#技術架構)
- [前端 UI/UX 升級總覽](#-前端-uiux-升級總覽)
  - [Deep Glass Dashboard](#deep-glass-dashboard)
  - [AI Insights Widget](#ai-insights-widget)
  - [動態體驗與互動](#動態體驗與互動)
- [電商 + 庫存整合設計](#-電商--庫存整合設計)
  - [Inventory 模組與資料模型](#inventory-模組與資料模型)
  - [銷售流程：訂單 → 預留 → 出貨](#銷售流程訂單--預留--出貨)
  - [採購流程：PO → 成本 → 入庫掛點](#採購流程po--成本--入庫掛點)
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
- [最近更新](#-最近更新)

## 🌟 系統特色

## 🆕 最近更新

- **2025-12-10 — 供應鏈與成本管理升級 (Supply Chain & Costing)**：
  - **產品建構 (Product Construction)**：
    - 支援 **BOM (物料清單)**：定義組合商品 (Bundle) 與製成品 (Manufactured) 的結構。
    - 支援 **組裝單 (Assembly Order)**：管理從零件到成品的生產過程。
    - 支援 **序號追蹤 (Serial Number)**：單品級別的 SN 碼全生命週期管理 (入庫/出貨/退貨)。
  - **浮動成本計算 (Floating Cost)**：
    - 實作遞迴成本計算引擎，自動展開 BOM 計算真實成本。
    - 支援多幣別匯率換算與服務費 (如包裝費) 加總。
  - **採購模組 (Purchase Module)**：
    - 新增 `PurchaseModule`，支援採購單建立與收貨流程。
    - 收貨時自動觸發庫存入庫與成本記錄。

- **2025-12-10 — 薪資計算核心與出勤異常偵測 (Payroll & Anomaly Detection)**：
  - **薪資計算核心 (Payroll Calculation)**：
    - **自動批次處理**：實作 `createPayrollRun`，可一次性為所有在職員工建立薪資單。
    - **薪資結構自動化**：
      - **基本薪資**：依據員工設定的 `salaryBaseOriginal` 自動帶入。
      - **加班費**：自動讀取考勤數據，依據 `1.33` 倍率計算加班費。
      - **勞健保/社保**：針對台灣 (TW) 與中國 (CN) 實作基礎扣除額邏輯（勞保、健保、社保）。
    - **結果產出**：自動生成 `PayrollItem` 明細，包含應發與應扣項目，完成從「打卡」到「發薪」的閉環。
  - **出勤異常偵測 (Attendance Anomaly Detection)**：
    - **每日自動排程**：實作 Midnight Cron Job，每日自動檢查前一日出勤狀況。
    - **異常類型偵測**：
      - **忘記打卡 (Missing Clock Out)**：偵測有上班卡但無下班卡的紀錄。
      - **遲到 (Late Arrival)**：比對排班表，超過 5 分鐘寬限期即標記為遲到。
      - **早退 (Early Departure)**：比對排班表，早於下班時間打卡即標記為早退。
    - **自動通知**：發現異常時，系統自動透過 `NotificationService` 發送通知給員工。

- **2025-12-10 — 應付帳款中心 (AP Hub) 整合與優化**：
  - **介面整合**：將「費用報銷 (Expense Payment)」與「應付帳款 (Accounts Payable)」合併為單一入口 `AccountsPayablePage`，消除功能重疊與混淆。
  - **功能增強**：
    - 新增分頁切換 (Tabs)：支援「費用報銷」與「採購發票」雙模式。
    - 新增儀表板統計 (Dashboard Stats)：前端即時計算待付款總額、逾期款項與待處理筆數。
    - 統一付款體驗：整合員工報銷與廠商付款的彈窗介面。
  - **系統優化**：
    - 移除左側選單中冗餘的「應付帳款」按鈕，統一由「費用付款」進入。
    - 棄用舊版 `ApInvoicesPage` 並實作自動轉址 (Redirect)。
    - 修復前端建置錯誤與元件屬性問題。
  - **API 整合 (Frontend Integration)**：
    - 整合 `GET /ap/invoices` 與 `GET /expenses` (status=approved) 於同一視圖。
    - 統一調用 `apService.recordPayment` 與 `expenseService.payExpenseRequest` 處理付款邏輯。

- **2025-12-06 — 關稅預付功能與行動裝置體驗優化**：
  - **新功能：關稅預付 (Prepaid Customs)**：
    - 新增 `prepaid_customs` 受款人與 `customsDeclarationNumber` 欄位。
    - 實作發票後補 (`isInvoicePending`) 與關稅預付標記邏輯。
    - 更新資料庫種子資料，加入「進口關稅」報銷項目 (科目 5122)。
  - **UX/UI 優化：行動裝置體驗 (Mobile RWD)**：
    - **費用申請頁面**：
      - 表格欄位響應式調整，手機版自動隱藏次要資訊。
      - 支援水平捲動 (`scroll={{ x: 800 }}`)。
      - 手機版面整合狀態標籤至項目名稱下方，提升閱讀效率。
      - 修復固定欄位背景色異常問題 (`!bg-transparent`)。
    - **費用審核中心**：
      - 表格欄位響應式調整與水平捲動支援。
      - 手機版面整合狀態標籤，並加入「關稅預付」紫色標籤提示。
      - 修復固定欄位背景色異常問題。
    - **共用元件**：
      - `GlassDrawer` 在手機寬度 (<640px) 下自動調整為全螢幕寬度。
  - **問題修復**：
    - 修復 `ExpenseRequestsPage` 中 `Alert` 元件的引用錯誤。
  - **待辦事項**：
    - [ ] 持續監控 RWD 在不同裝置上的實際表現。

- **2025-12-04 — 後端功能補全與環境優化**：
  - **即時通知系統**：
    - 新增 `NotificationGateway` (WebSocket) 支援即時推播。
    - 整合 `NotificationService`，實現後端事件即時通知前端。
  - **報表匯出功能**：
    - 於 `ReportsController` 新增 `/export` 端點，支援報表資料匯出。
  - **系統穩定性與建置修復**：
    - 修正 `@nestjs/websockets` 與 `socket.io` 依賴缺失問題。
    - 解決 Prisma Client 生成時的資料庫連線問題，確保 `npm run build` 順利執行。
- **2025-12-04 — 費用申請流程優化 (Expense Request Workflow Enhancement)**：
  - **資料庫 Schema 更新**：
    - 新增 `payeeType` 欄位：區分「員工代墊 (Reimbursement)」與「廠商直付 (Vendor Direct Payment)」。
    - 新增 `paymentMethod` 欄位：記錄付款方式（現金、轉帳、支票等）。
    - 新增 `dueDate` 欄位：記錄預計付款日。
  - **後端 API 更新**：
    - 更新 `CreateExpenseRequestDto` 支援上述新欄位。
    - 更新 `ExpenseService` 處理邏輯，將前端傳入的付款資訊寫入資料庫。
  - **前端介面更新**：
    - **申請表單優化**：
      - 新增「受款人類型」選擇器。
      - 新增「預計付款日」選擇器。
      - 新增「付款方式」下拉選單。
    - **列表顯示優化**：
      - 新增「預計付款日」欄位顯示。
      - 優化付款狀態顯示邏輯。
  - **開發體驗優化**：
    - 更新 Dev Container 設定 (`settings.json`)，啟用終端機指令自動批准，提升開發效率。

- **2025-12-02 — AI 智能升級與架構重構**：
  - **UI/UX 優化**：統一系統用語，將「退回」修正為「駁回」；修復 Sidebar 版面問題。
  - **AI 架構重構**：
    - 建立全域 `AiModule`，集中管理 AI 邏輯。
    - 支援多模型切換 (Gemini 2.0 Flash, 2.5 Pro/Flash, 3.0 Pro Exp)。
    - 新增 `AiInsightsService` (每日財務簡報) 與 `AiCopilotService` (對話式查詢)。
  - **前端 AI 功能**：
    - **AI Context**：全域模型狀態管理。
    - **設定面板 (Settings Drawer)**：新增 AI 模型切換選單，可即時調整使用的 Gemini 版本。
    - **AI Insights Widget**：儀表板新增每日財務摘要組件。
    - **AI Copilot Widget**：新增懸浮聊天助手，支援自然語言查詢銷售與費用數據（含待審核單據篩選）。
    - **智能費用填寫**：AI 建議報銷項目時，現在能自動從描述中提取金額並填入。
  - **後端修復**：修正 `dayjs` 依賴缺失與 Prisma 查詢欄位錯誤，確保 AI 服務穩定運行。

- **2025-12-01 — AI 智能建議與反饋閉環（Beta）**：
  - **資料模型升級**：`expense_requests` 新增 `suggested_item_id`、`suggested_account_id`、`suggestion_confidence`；`reimbursement_items` 對應 `FeedbackSuggestedItem`/`FeedbackChosenItem`；`accounting_classifier_feedbacks` 追加 `entity_id`、`description`、`suggested_item_id`、`chosen_item_id`，完整追蹤建議與實際決策。
  - **API 與服務**：`AccountingClassifierService` 將 Gemini 2.0 Flash AI、關鍵字規則與回饋資料整合，並透過 `/api/v1/expense/predict-category`（建議）、`/requests/:id/feedback`（回饋）、`/seed-ai-items`（建立題庫）、`/test-ai-connection`（健檢）等端點對外提供。
  - **前端體驗**：`ExpenseRequestsPage` 顯示 AI 推薦項目與信心值，允許一鍵採用或提交修正；`AICopilotWidget` 與 `AIInsightsWidget` 會帶入最新建議與異常提醒，協助會計加速審核。
- **2025-12-01 — 全系統 UI/UX 一致性優化與功能增強**：
  - **介面標準化**：全面重構 `VendorsPage` (供應商)、`BankingPage` (銀行)、`PayrollPage` (薪資) 與 `ReimbursementItemsAdminPage` (報銷項目管理)，統一採用 **Drawer** 側邊欄編輯模式、**Glassmorphism** 視覺風格與 **KPI 統計儀表板**，提升操作體驗一致性。
  - **費用申請升級**：`ExpenseRequestsPage` 新增 **憑證/單據照片上傳** 功能，支援圖片與 PDF 格式，並優化歷程紀錄顯示樣式，解決文字裁切問題。
  - **細節優化**：調整 `ApInvoicesPage` 版面間距，並修復全系統列表頁面在 API 異常時的資料處理邏輯（防呆機制），徹底解決 `filter of undefined` 錯誤。
- **2025-11-29 — 應付帳款批次匯入與費用審核全面升級**：
  - **費用管理**：完成報銷項目後台 CRUD、核銷管理 UI 與 Jest e2e 覆蓋，管理員可直接於審核佇列批次核准/駁回申請並同步更新費用分錄。
  - **AP 後端**：Prisma `ApInvoice` Schema 新增循環付款欄位（`payment_frequency`, `next_due_date`, `recurring_day_of_month` 等），並提供批次匯入、付款排程更新與逾期/未付款統計 API，支援月結提醒與財務警示。
  - **AP 前端**：`ApInvoicesPage` 導入 KPI 統計卡＋警示 Banner、搜尋/狀態篩選、支援 CSV 上傳的批次匯入流程、動態供應商選單、付款排程維護與「記錄付款」行內操作，並搭配 `ap.service.ts`、`types/index.ts` 的新欄位與方法。
- **2025-11-23 — 核心會計模組前端實作完成**：
  - **應收帳款 (AR)**：新增 `ArInvoicesPage`，支援發票開立、列表檢視與狀態追蹤。
  - **應付帳款 (AP)**：新增 `ApInvoicesPage`，支援供應商發票登記與審核流程。
  - **銀行與資金 (Banking)**：新增 `BankingPage`，整合銀行帳戶總覽與交易明細調節功能。
  - **薪資與員工 (Payroll & HR)**：新增 `PayrollPage` (薪資計算) 與 `EmployeesPage` (員工/部門管理)，並依需求將員工與部門拆分管理。
  - **架構優化**：建立對應的 Service 層 (`ar`, `ap`, `banking`, `payroll`) 與 TypeScript 定義，並更新路由與導覽列。
- **2025-11-23 — AccessControlPage 全面在地化**：帳號與權限管理頁（使用者／角色／權限三個分頁）所有標題、欄位、提示訊息、按鈕文字與確認對話框，已全部改用繁體中文，並統一語氣與專業用詞。
- **2025-11-23 — AccountsPage 中文化與標籤優化**：`Chart of Accounts` 改名為「會計科目表」，並新增 `typeLabelMap` 讓科目類別標籤顯示「資產／負債／權益／收入／費用」等繁體中文名稱，以提升可讀性。

### 商業面亮點
- ✅ **多公司實體管理**：支援跨國營運，每個實體獨立會計帳。
- ✅ **多幣別支援**：全系統採用 4 欄位金額標準（原幣、幣別、匯率、本位幣）。
- ✅ **多電商平台整合規劃**：對應 Shopify、momo、PChome、Shopee、Amazon 等 9 個平台的銷售渠道模型。
- ✅ **完整會計循環**：分錄、過帳、試算、結帳、報表一路打通。
- ✅ **RBAC 權限控制**：ADMIN / ACCOUNTANT / OPERATOR 三層角色，支援細緻資源權限。
- ✅ **審批流程**：費用申請、薪資發放等關鍵流程都有審批節點。
- ✅ **銀行對帳**：支援銀行交易匯入與會計紀錄對應，預留自動匹配規則。

### 技術架構
- **Backend**：NestJS 11.x + TypeScript + Prisma ORM
- **Database**：PostgreSQL 16
- **Frontend**：React 18 + Vite + Ant Design + TypeScript
- **部署**：Docker Compose + GitHub Codespaces Ready

---

## 🎨 前端 UI/UX 升級總覽

這個專案的前端不只是管理介面，而是一個「有靈魂的財務操作台」，特別針對財會與電商營運人員的日常使用場景做優化。

### Deep Glass Dashboard

- **半透明玻璃卡片**：Dashboard 主要區塊採用 glassmorphism 設計，搭配柔和邊框與陰影，讓多維度財務資訊在視覺上更有層次。
- **模組化資訊卡**：營收、毛利、訂單數、庫存風險等卡片模組化，未來可自由增減或替換。
- **高對比但不刺眼的色彩**：針對長時間閱讀報表/列表優化，減少視覺疲勞。

### AI Insights Widget

- **位置**：放在 `DashboardPage`，作為「右下角的 AI 財務顧問」。
- **功能定位**：將多張報表與即時數據消化成 2~3 句可讀性高的洞見（例如：平台毛利異常、品類庫存週轉天數拉長等）。
- **視覺細節**：
  - Shimmering Border：外框有微光流動效果，暗示「正在思考 / 分析」。
  - Typewriter Effect：文字逐字打出，讓 AI 洞見感覺像現場生成而非死板數據。

### 動態體驗與互動

- **`DashboardLayout`**：
  - 左側側邊選單依模組分群（會計 / 銷售 / AR / AP / 銀行 / 薪資 / 報表等）。
  - 已將「供應商管理 (Vendors)」加入 AP 群組，對應後端 Vendor 模組與前端 `VendorsPage`。
- **動畫與過場**：使用 Framer Motion 做細微淡入與 hover 動畫，讓使用手感更接近 SaaS 產品而非傳統 MIS。
- **表單與列表體驗**：
  - 採用 Ant Design Table + Modal Form 模式（如 `AccountsPage`、`VendorsPage`）。
  - 針對欄位排版、對齊與 Tag 顏色做精緻調整，提升密集財務資訊的可掃描性。

## 🤖 AI 智能建議與反饋迴路

### 功能總覽
- **多信號推論**：`AccountingClassifierService` 先以 Gemini 2.0 Flash 生成建議，再搭配關鍵字規則與白名單策略，輸出最終 `suggestedItemId`、`suggestedAccountId` 與 `suggestionConfidence`。
- **建議存證**：所有決策寫入 `expense_requests`，供審核人員檢視「AI 推薦 vs. 實際決策」。
- **回饋閉環**：審核者或申請者可呼叫 `/expense/requests/:id/feedback`，系統會在 `accounting_classifier_feedbacks` 中記錄 `suggested_item_id`、`chosen_item_id`、`label` 與 `features`，下一次推論會將歷史修正納入 Few-shot 參考。

### 資料流程
1. **輸入**：員工於 `ExpenseRequestsPage` 輸入用途、金額與憑證。
2. **推論**：後端呼叫 `predictReimbursementItem`，Gemini + 規則雙層推論，並同步查出可用的 `ReimbursementItem`。
3. **呈現**：前端顯示建議名稱、所屬科目與信心值，低信心（<0.4）會加註提醒。
4. **回饋**：審核者改選其他項目或填寫錯誤原因時，透過 Feedback API 寫入 `AccountingClassifierFeedback`，與 `ReimbursementItem` 之間透過 `FeedbackSuggestedItem` / `FeedbackChosenItem` 名稱化關聯。

### 關鍵資料表
- `expense_requests`：新增 `suggested_item_id`, `suggested_account_id`, `suggestion_confidence` 欄位與 `ExpenseRequestSuggestedItem` 關聯，完整紀錄每次 AI 推薦。
- `reimbursement_items`：保留使用者可選清單，並新增 `suggestedFeedbacks` / `chosenFeedbacks` 反向關聯，方便統計建議命中率。
- `accounting_classifier_feedbacks`：擴充 `entity_id`, `description`, `suggested_item_id`, `chosen_item_id` 欄位，讓每筆反饋都能回溯到實體、敘述與最終選擇。

### 設定與檢查
```bash
# 1. 更新資料庫 Schema
cd backend
npm run prisma:migrate

# 2. 產生/更新 Prisma Client
npm run prisma:generate

# 3. 設定環境變數
echo "GEMINI_API_KEY=your-key" >> ../.env

# 4. 建立 AI 報銷項目題庫（選擇性，但強烈建議）
# 預設實體為 tw-entity-001，若需其他實體請先調整 src/scripts/seed-ai-reimbursement-items.ts
npm run seed:ai-items

# 5. 健檢 + 測試推論
curl -X GET http://localhost:3000/api/v1/expense/test-ai-connection
curl -X POST http://localhost:3000/api/v1/expense/predict-category -d '{"entityId":"tw-entity-001","description":"採買攝影器材"}' -H "Content-Type: application/json" -H "Authorization: Bearer <token>"
```

### 前端整合
- `ExpenseRequestsPage` 在送出需求前即會呼叫 `/expense/predict-category`，同時將 `suggestionConfidence` 視覺化，並允許「採用建議 / 改選其他項目 / 提交回饋」。
- `AICopilotWidget`（`components/AICopilotWidget.tsx`）會顯示最新建議、觸發率與錯誤回饋摘要；`AIInsightsWidget` 則針對財務異常額外提供語意化建議。
- 所有回饋結果會透過 `expense.service.ts` 的 `submitFeedback` 儲存到資料庫，可在 `ReimbursementItemsAdminPage` 看到命中率與常見誤判描述。

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

系統種子資料會依照環境變數建立 SUPER_ADMIN 帳號。

請在啟動或執行 `prisma db seed` 前設定以下環境變數（建議寫入 `.env`）：

```bash
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="ChangeMeToAStrongSecret"
SUPER_ADMIN_NAME="系統管理員"
```

> ⚠️ **重要**：密碼只應透過環境變數提供，請勿將真實帳密寫入程式碼或版本控制。
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
    "email": "${SUPER_ADMIN_EMAIL}",
    "password": "<SUPER_ADMIN_PASSWORD>"
  }'
```

> 在終端機中預先設定 `SUPER_ADMIN_EMAIL` 與 `SUPER_ADMIN_PASSWORD`，或在指令中以實際帳密取代佔位符號。

回應：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "${SUPER_ADMIN_EMAIL}",
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
│   │   └── modules/           # 業務模組
│   │       ├── auth/          # 認證授權
│   │       ├── users/         # 使用者管理
│   │       ├── entities/      # 實體管理
│   │       ├── accounting/    # 會計核心
│   │       ├── sales/         # 銷售管理（訂單、渠道、客戶）
│   │       ├── ar/            # 應收帳款
│   │       ├── ap/            # 應付帳款
│   │       ├── expense/       # 費用管理
│   │       ├── cost/          # 成本與進貨成本
│   │       ├── inventory/     # 庫存管理（倉庫、快照、庫存異動）
│   │       ├── vendor/        # 供應商管理 API
│   │       ├── banking/       # 銀行對帳
│   │       ├── payroll/       # 薪資管理
│   │       ├── approvals/     # 審批流程
│   │       ├── invoicing/     # 電子發票整合
│   │       ├── reconciliation/# 銀行對帳結果與調節
│   │       └── reports/       # 財務報表
│   └── Dockerfile
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/        # UI 元件（DashboardLayout、AIInsightsWidget 等）
│   │   ├── contexts/          # Context (AuthContext, ThemeContext)
│   │   ├── pages/             # 頁面 (Login, Dashboard, Accounts, Vendors ...)
│   │   ├── services/          # API Services（accounting, auth, vendor ...）
│   │   └── App.tsx            # 路由與整體佈局
│   └── package.json
├── .devcontainer/              # DevContainer 配置
│   └── devcontainer.json
├── docker-compose.yml          # Docker Compose 配置
├── .env.example                # 環境變數範例
└── README.md
```

---

## 🧩 資料庫 Schema

### 核心資料表（> 36 個，包含電商與庫存）

#### 系統核心
- `users` - 使用者
- `roles` - 角色（ADMIN、ACCOUNTANT、OPERATOR）
- `permissions` - 權限
- `user_roles` - 使用者角色關聯
- `role_permissions` - 角色權限關聯
- `audit_logs` - 審計軌跡

#### 會計核心
- `entities` - 公司實體
- `accounts` - 會計科目表（採用台灣商業會計法 112 年度後「商業會計項目表」為主，並加上系統用輔助欄位）
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

#### 庫存模組（Inventory）
- `warehouses` - 倉庫（公司倉、3PL、平台倉等）
- `inventory_snapshots` - 庫存快照（每實體 × 倉庫 × 商品一筆，紀錄 OnHand / Allocated / Available）
- `inventory_transactions` - 庫存異動流水（入庫 / 出庫 / 預留 / 釋放 / 調整）

#### AR/AP
- `ar_invoices` - 應收發票
- `ap_invoices` - 應付發票

#### 費用與審批
- `expense_requests` - 費用申請
- `expenses` - 費用記錄
- `expense_items` - 費用明細
- `reimbursement_items` - 員工可選的報銷模板，含關鍵字與審批政策，並追蹤 AI 建議命中率
- `accounting_classifier_feedbacks` - 儲存建議與實際選擇、信心值與特徵向量，作為 AI 訓練資料
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
| 最高管理員 | `SUPER_ADMIN` | 全系統權限與設定管理 |
| 系統管理員 | `ADMIN` | 使用者管理、系統設定、多數模組操作 |
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
- ✅ **4個角色**：SUPER_ADMIN、ADMIN、ACCOUNTANT、OPERATOR
- ✅ **1個管理員**：Email 來源 `SUPER_ADMIN_EMAIL`
- ✅ **64個會計科目**：完整 IFRS + 台灣常用科目表
  - 台灣實體採用官方「商業會計項目表（112 年度及以後）」核心子集合，並配合電商實務選取常用科目
  - 依科目代碼自動推導 `type`：1/2/3/4/5/6/8 開頭分別對應資產/負債/權益/收入/成本與費用，7 開頭再依實際科目（如利息收入、兌換利益）區分收入或費用
  - `accounts` 上新增 `isReimbursable` 欄位：
    - 預設所有 6 開頭營業費用科目視為「可以作為員工報支選項」
    - 對薪資、折舊等純會計或人事類科目（例如 `6111 薪資支出`、`6125 折舊`）設為 `false`，避免員工直接選用
    - 這個欄位是未來「員工費用申請 / 報銷流程」的基礎，前端會只顯示 `isReimbursable = true` 的科目供選擇
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

### AI 報銷題庫（選用，但建議啟用）
- 設定 `GEMINI_API_KEY` 後，於 `backend/` 執行 `npm run seed:ai-items`。
- 腳本會使用 Gemini 依據會計科目自動生成 30~50 個 `ReimbursementItem`，預設實體為 `tw-entity-001`；若需切換實體可調整 `src/scripts/seed-ai-reimbursement-items.ts` 中的常數。
- 自動帶入的 `keywords`、`defaultReceiptType` 與 `allowedReceiptTypes` 會作為 AI 推論與表單搜尋的資料來源。

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

### ⚠️ 重要：Monorepo 結構說明

此專案為 **monorepo** 結構：
- `backend/` - NestJS 後端應用程式
- `frontend/` - React 前端應用程式

部署時必須正確設定 **Root Directory**，否則會找不到 `package.json`。

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

#### ⚠️ 關鍵設定：Root Directory

**方案 A：設定 Root Directory（推薦）**

1. 點擊 "New" → "Web Service"
2. 連接您的 GitHub 儲存庫
3. **關鍵設定**：
   - **Name**: `ecom-accounting-backend`
   - **Root Directory**: `backend` ⚠️ **必須設定為 backend**
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`

**方案 B：在命令中切換目錄**

如果 Root Directory 留空，則必須在命令中加入 `cd backend`：
   - **Root Directory**: （留空）
   - **Build Command**: `cd backend && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd backend && npx prisma migrate deploy && npm run start:prod`

#### 環境變數設定

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

#### 常見錯誤排解

- ❌ **錯誤**：`Cannot find module '@nestjs/cli'` 或 `nest: not found`
  - ✅ **解決**：確認 `backend/package.json` 的 build script 使用 `node_modules/.bin/nest build`
  
- ❌ **錯誤**：`Error: Cannot find module './dist/main'`
  - ✅ **解決**：確認 Root Directory 設定為 `backend`，或在命令前加 `cd backend`
  
- ❌ **錯誤**：`sh: 1: nest: not found`
  - ✅ **解決**：`@nestjs/cli` 必須在 `devDependencies` 中，且 build script 使用完整路徑

### 4. 建立 Frontend Web Service
1. 點擊 "New" → "Static Site"
2. 連接相同的儲存庫
3. 設定：
   - **Name**: `ecom-accounting-frontend`
   - **Root Directory**: `frontend` ⚠️ **必須設定為 frontend**
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
    "email": "${SUPER_ADMIN_EMAIL}",
    "password": "<SUPER_ADMIN_PASSWORD>"
  }'
```

> 建議於 Render 控制台設定對應的環境變數，再使用上述指令測試登入。

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

### 8️⃣ 前端深度升級 (Frontend Deep Upgrade) ✅

我們將前端從傳統的後台管理介面，升級為現代化、高互動性的 SaaS 產品體驗。

#### 🎨 視覺與設計語言 (Visual & Design Language)
- **Deep Glass UI (深層玻璃擬態)**：
  - 捨棄平面的白色背景，改用 **Mesh Gradient (網格漸層)** 作為全域背景，營造空間深度。
  - 實作 **Apple-style Glassmorphism**：
    - `backdrop-filter: blur(40px) saturate(200%)` 創造極致通透感。
    - 引入 **Specular Border (鏡面邊框)**，模擬真實玻璃邊緣的光線折射。
    - 側邊欄與頂部導航完全透明化，讓背景流動感貫穿全站。
- **Dark Mode (深色模式)**：
  - 完整支援一鍵切換深色/淺色主題。
  - 使用 CSS Variables (`--glass-bg`, `--text-primary`) 確保切換流暢無閃爍。
  - 針對深色模式優化了玻璃材質的透明度與光澤感。

#### 🎬 動態設計 (Motion Design)
- **Staggered Entry (交錯進場)**：
  - 頁面載入時，卡片與元件採用 `stagger` 策略依序滑入，消除資訊轟炸的壓迫感。
- **Ambient Background (環境氛圍)**：
  - 背景中的彩色光球 (Orbs) 會緩慢漂浮與變形 (`float` animation)，賦予畫面生命力，避免死板。
- **Micro-interactions (微交互)**：
  - 按鈕、卡片懸浮時的細微放大與光影變化。
  - 點擊回饋與轉場動畫。

#### ⚡️ 生產力與互動 (Productivity & Interaction)
- **Living Data (即時數據模擬)**：
  - 儀表板不再是靜態圖片。數字會模擬即時跳動，並在變動時觸發 **Flash Text** 視覺脈衝。
  - 新增 "Live Updates" 呼吸燈指示器，強化系統運作中的感知。
- **Command Palette (全域指令面板)**：
  - 按下 `Cmd + K` (Mac) 或 `Ctrl + K` (Win) 喚起。
  - 支援鍵盤優先導航：快速跳轉頁面、執行系統指令 (登出、切換主題)。
  - 介面採用 Deep Glass 風格，與整體 UI 完美融合。
- **Floating Bulk Action Bar (懸浮批次操作)**：
  - 類似 Apple Mail 的設計，當選取列表項目時，底部自動浮現操作列。
  - 支援批次刪除、匯出、審核等動作。

#### 🤖 AI 整合 (AI Integration)
- **AI Insights Widget (智慧洞察元件)**：
  - 儀表板頂部的主動式 AI 分析區塊。
  - **Shimmering Border (流光邊框)**：使用流動的極光邊框暗示 AI 運算能量。
  - **Typewriter Effect (打字機效果)**：模擬 AI 逐字生成報告的過程。
- **AI Copilot Widget (懸浮助理)**：
  - 右下角的常駐 AI 助手，支援自然語言問答。
  - 提供快捷指令 (Suggested Prompts) 引導使用者探索數據。

#### 📊 數據視覺化 (Data Visualization)
- **Sales Analytics (銷售分析)**：
  - 整合 `recharts` 繪製高質感圖表。
  - 支援 Area Chart (趨勢)、Bar Chart (比較)、Composed Chart (複合分析)。
  - 圖表配色自動適應深色/淺色主題。
- **Excel Export (報表匯出)**：
  - 前端直接生成 Excel 檔案，支援自定義欄位與格式。

#### 🛠️ 系統功能 (System Features)
- **Order Details Drawer (訂單詳情側邊欄)**：
  - 點擊列表不跳頁，直接滑出詳情側邊欄，保持工作流暢。
  - 包含訂單時間軸 (Timeline) 與商品明細。
- **Login Page Upgrade (登入頁升級)**：
  - 動態背景光暈。
  - 密碼強度即時檢測。
  - 社交登入 UI 整合。


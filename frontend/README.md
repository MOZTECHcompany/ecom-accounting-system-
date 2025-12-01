# 🎨 Frontend — Deep Glass Finance Console

React 19 + Vite + Ant Design 5 打造的單頁式應用，專為財會與營運人員設計。核心特色：高對比玻璃化介面、AI 洞察 Widget、費用申請智慧化體驗。

## 技術堆疊
- React 19 + TypeScript + Vite（Rolldown 7）
- Ant Design 5、Framer Motion、cmdk（指令面板）、Recharts
- Axios 封裝 API，React Context 管理 Auth / Theme
- Tailwind 4（PostCSS 模式）處理部分原子化樣式

## 功能亮點
- **DashboardLayout**：模組化側邊欄、KPI 卡片與快速搜尋，支援暗色／亮色主題。
- **AIInsightsWidget / AICopilotWidget**：串接 `/api/v1/expense/predict-category` 與財務概況，顯示 AI 洞察、異常提醒與建議成果。
- **ExpenseRequestsPage**：整合附件上傳、AI 推薦報銷項目、信心指標與「建議錯誤」回饋；審核者可即時比較建議與最終選擇。
- **全模組在地化**：供應商、銀行、薪資、存貨等頁面皆採 Drawer 流程與繁體中文術語，降低訓練成本。

## 快速開始
```bash
cd frontend
npm install

# 設定環境變數（預設讀取 repo 根目錄的 .env）
echo "VITE_API_URL=http://localhost:3000/api/v1" >> ../.env

npm run dev   # http://localhost:5173
```

如需獨立 `.env.local`，可在 `frontend/` 建立並覆寫 `VITE_API_URL`。

## 常用指令
- `npm run dev`：開發模式（含 HMR 與 Ant Design token 即時預覽）。
- `npm run build`：型別檢查 (`tsc -b`) + 產生 `dist/`。
- `npm run preview`：在本機預覽打包結果。
- `npm run lint`：ESLint（含 React Hooks / Refresh 插件）。

## AI 體驗整合
- `services/expense.service.ts` 內的 `predictReimbursementItem` 與 `submitFeedback` 會呼叫後端 AI 端點，並封裝錯誤處理（缺少 `GEMINI_API_KEY` 會回傳明確訊息）。
- `components/AICopilotWidget.tsx` 會顯示最近的建議命中率與常見錯誤原因，可直接導向 `ExpenseRequestsPage` 的填單視窗。
- `pages/ExpenseRequestsPage.tsx` 於建立請款時自動帶入 `suggestedItemId`、`suggestionConfidence`，並在使用者改選時彈出回饋提示，確保 `AccountingClassifierFeedback` 收到足夠資料。

## 專案結構
```
src/
├── components/              # 共用 UI（DashboardLayout、AI widgets、通知中心）
├── pages/                   # 功能頁面（Expense, AP/AR, Banking, Payroll 等）
├── services/                # Axios service；expense/accounting/vendor…
├── contexts/                # AuthContext、ThemeContext
├── assets/ + styles         # Glassmorphism、動畫資源
└── types/                   # 與後端 API 對應的型別宣告
```

## 與後端搭配
- 確保 `VITE_API_URL` 指向 Nest API 的 `/api/v1` 前綴。
- 登入後 JWT 會儲存在 Context/Memory（未寫入 localStorage），重新整理後需重新登入。
- 若需要同時開啟多個實體，可在 `AuthContext` 中覆寫 `defaultEntityId` 或於頁面層讀取 `entityId` 查詢參數。

## 疑難排解
- **CORS 錯誤**：請確認後端 `.env` 的 `CORS_ORIGIN` 包含本地前端網址。
- **AI 建議無回應**：檢查 `/expense/predict-category` 回應是否回傳 `GEMINI_API_KEY is not configured`，若是，需先在後端設定金鑰並重新啟動。
- **樣式閃爍**：Tailwind 4 + Ant Design token 初次載入時會延遲 1~2 幀，可在 `ThemeContext` 控制 `isReady` 旗標避免渲染主要內容。

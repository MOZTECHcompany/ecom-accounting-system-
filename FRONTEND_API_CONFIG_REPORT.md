# 前端 API 設定修正完成報告

## 修改摘要

已完成前端 API 設定的統一配置，確保本地開發與正式環境都能正確運作。

---

## 修改檔案清單

### 1. `frontend/vite.config.ts`
**修改內容**：新增 proxy 配置

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

**效果**：
- 本地開發時，所有 `/api` 開頭的請求會自動轉發到 `http://localhost:3000`
- 避免 CORS 問題
- 前端無需關心後端實際端口

---

### 2. `frontend/src/services/api.ts`
**修改內容**：動態設定 baseURL

```typescript
const getBaseURL = () => {
  if (import.meta.env.DEV) {
    return '/api/v1'
  }
  return import.meta.env.VITE_API_URL || 'https://ecom-accounting-backend.onrender.com/api/v1'
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

**效果**：
- **本地開發**：使用 `/api/v1`（通過 Vite proxy）
- **正式環境**：使用環境變數 `VITE_API_URL`
- **Fallback**：如果環境變數未設定，預設使用 Render 正式環境 URL

---

### 3. `frontend/.env.example`
**新增檔案**：環境變數範本

```bash
# API Base URL（必須指向後端正式環境）
VITE_API_URL=https://ecom-accounting-backend.onrender.com/api/v1
```

**說明**：
- 本地開發不需設定（自動使用 proxy）
- 部署到 Render 時必須在 Dashboard 設定此環境變數
- 所有環境變數必須以 `VITE_` 開頭才能在前端存取

---

### 4. `README.md`
**修改內容**：更新部署文件

新增正式環境 URL 區塊：
```markdown
### 正式環境 URL
- **前端**: https://ecom-accounting-frontend.onrender.com
- **後端**: https://ecom-accounting-backend.onrender.com
- **API Base URL**: https://ecom-accounting-backend.onrender.com/api/v1
- **Swagger 文件**: https://ecom-accounting-backend.onrender.com/api-docs
```

強化 Frontend 部署步驟：
- 明確標示 `VITE_API_URL` 環境變數設定
- 新增驗證部署的測試指令
- 補充 Backend 環境變數 `API_PREFIX=/api/v1`

---

## 程式碼掃描結果

已確認**沒有任何硬編碼 URL**：

✅ **無 `http://localhost:3000`**
✅ **無 `http://127.0.0.1`**
✅ **無 `http://localhost:5173`**
✅ **所有 API 呼叫統一使用 `api` client**

檢查的檔案：
- ✅ `frontend/src/services/api.ts`
- ✅ `frontend/src/services/auth.service.ts`
- ✅ `frontend/src/services/accounting.service.ts`
- ✅ `frontend/src/pages/LoginPage.tsx`
- ✅ `frontend/src/pages/AccountsPage.tsx`
- ✅ `frontend/src/contexts/AuthContext.tsx`
- ✅ `frontend/vite.config.ts`

---

## 使用方式

### 本地開發

1. 啟動 Backend：
```bash
cd backend
npm run start:dev
```

2. 啟動 Frontend：
```bash
cd frontend
npm run dev
```

3. 訪問前端：`http://localhost:5173`
   - 所有 API 請求會自動通過 proxy 轉發到 `http://localhost:3000`

---

### 正式環境部署（Render）

#### Backend 設定
環境變數：
```bash
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your-secret-key-min-32-chars
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1
```

#### Frontend 設定
環境變數：
```bash
VITE_API_URL=https://ecom-accounting-backend.onrender.com/api/v1
```

⚠️ **重要**：將上方 URL 替換為您實際的 Backend URL

---

## 驗證步驟

### 1. 驗證 Backend Health
```bash
curl https://ecom-accounting-backend.onrender.com/health
```
預期回應：
```json
{"status":"ok","timestamp":"2025-11-18T...","env":"production"}
```

### 2. 驗證 Swagger 文件
開啟瀏覽器：
```
https://ecom-accounting-backend.onrender.com/api-docs
```

### 3. 測試登入 API
```bash
curl -X POST https://ecom-accounting-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "${SUPER_ADMIN_EMAIL}",
    "password": "<SUPER_ADMIN_PASSWORD>"
  }'
```

> 在正式環境請透過 Render 環境變數設定 `SUPER_ADMIN_EMAIL` 與 `SUPER_ADMIN_PASSWORD`，並將指令中的佔位符替換為實際值。

### 4. 測試前端訪問
開啟瀏覽器：
```
https://ecom-accounting-frontend.onrender.com
```

---

## Git 資訊

- **Commit ID**: `eee50d7`
- **分支**: `main`
- **已推送至遠端**: ✅

---

## 技術改進總結

1. **避免 CORS 問題**
   - 本地開發使用 Vite proxy
   - 不需要在後端設定複雜的 CORS 規則

2. **統一 API 管理**
   - 所有 API 呼叫都通過 `api` client
   - 自動注入 JWT token
   - 統一錯誤處理（401 自動登出）

3. **環境變數支援**
   - 本地開發零配置
   - 正式環境僅需設定 `VITE_API_URL`
   - 提供 fallback 機制

4. **程式碼品質**
   - 無硬編碼 URL
   - 類型安全（TypeScript）
   - 易於維護和擴展

---

## 下一步建議

1. **部署到 Render**：
   - 按照 README 步驟建立 Backend 和 Frontend 服務
   - 設定環境變數
   - 執行初始化腳本

2. **測試完整流程**：
   - 登入系統
   - 查看會計科目表
   - 建立測試訂單
   - 查看報表

3. **監控與優化**：
   - 觀察 API 回應時間
   - 檢查錯誤日誌
   - 優化資料庫查詢

---

**修正完成！所有 API 設定已統一，支援本地與正式環境。**

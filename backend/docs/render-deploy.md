# Render 部署指南

## 前置作業

### 1. 準備 Render 帳號
- 註冊 Render 帳號：https://render.com
- 連結 GitHub 帳號

### 2. 建立 PostgreSQL 資料庫
1. 登入 Render Dashboard
2. 點選 "New" → "PostgreSQL"
3. 設定資料庫名稱：`ecom-accounting-db`
4. 選擇區域：Singapore (最接近台灣)
5. 選擇方案：Free (開發測試) 或 Starter (正式環境)
6. 建立後複製 **Internal Database URL**

### 3. 建立 Web Service

#### 步驟 A：基本設定
1. 點選 "New" → "Web Service"
2. 連結 GitHub Repository：選擇此專案
3. 填寫基本資訊：
   - Name: `ecom-accounting-api`
   - Region: Singapore
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: Docker
   - Instance Type: Free (開發測試) 或 Starter (正式環境)

#### 步驟 B：環境變數設定
點選 "Environment" 分頁，新增以下環境變數：

```bash
# 資料庫連線 (從 PostgreSQL Internal Database URL 複製)
DATABASE_URL=postgresql://user:password@host/database

# JWT 密鑰 (自行產生強密碼)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# 應用程式設定
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1
```

#### 步驟 C：Health Check 設定
在 "Settings" 分頁：
- Health Check Path: `/health`
- Deploy 後會自動檢查此端點

### 4. 部署流程

#### 自動部署
- 推送 commit 到 `main` branch
- Render 自動觸發部署
- 查看 "Logs" 分頁監控部署進度

#### 手動部署
1. 進入 Dashboard
2. 點選 "Manual Deploy" → "Deploy latest commit"

### 5. 資料庫初始化

部署完成後，執行以下步驟：

1. 開啟 Render Shell (Dashboard → Shell 分頁)
2. 執行 seed 指令：
```bash
npm run prisma:seed
```

3. 驗證資料：
```bash
npx prisma studio
```

### 6. 驗證部署

#### 檢查 Health Check
```bash
curl https://your-app.onrender.com/health
# 預期回應：{"status":"ok","timestamp":"2024-...","env":"production"}
```

#### 檢查 Swagger 文件
開啟瀏覽器：
```
https://your-app.onrender.com/api/docs
```

#### 測試 API
```bash
# 健康檢查
curl https://your-app.onrender.com/health

# 登入測試
curl -X POST https://your-app.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# 取得訂單列表 (需帶 JWT token)
curl https://your-app.onrender.com/api/v1/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 常見問題

### Q1: 部署失敗怎麼辦？
查看 Render Logs 分頁：
- 檢查 Dockerfile 是否正確
- 確認環境變數是否設定完整
- 查看 Prisma migration 是否成功

### Q2: 資料庫連線失敗？
- 確認 `DATABASE_URL` 使用 **Internal Database URL**
- 檢查資料庫是否啟動成功
- 驗證 connection string 格式：`postgresql://user:pass@host:port/db`

### Q3: Health Check 失敗？
- 確認 `/health` endpoint 已部署
- 檢查 PORT 環境變數是否設定為 3000
- 查看應用程式是否正常啟動

### Q4: CORS 錯誤？
- 已設定 `origin: '*'` 允許所有來源
- 如需限制特定網域，修改 `main.ts` 中的 CORS 設定

### Q5: Swagger 無法存取？
- 確認已部署最新版本 (production 環境已啟用 Swagger)
- 開啟瀏覽器檢查：`https://your-app.onrender.com/api/docs`

## 進階設定

### 自訂網域
1. Render Dashboard → Settings → Custom Domain
2. 新增網域名稱
3. 設定 DNS CNAME 記錄指向 Render

### 環境變數管理
- 建議使用 Render 的環境變數功能，不要將敏感資訊寫入 `.env.production`
- 每次修改環境變數後需手動觸發重新部署

### 資料庫備份
- Render PostgreSQL 提供自動每日備份 (Starter plan 以上)
- 可手動匯出：Dashboard → PostgreSQL → Export

### 監控與日誌
- Render Dashboard → Metrics：查看 CPU、記憶體使用率
- Logs 分頁：即時查看應用程式日誌
- 整合第三方監控：Sentry、Datadog 等

## 成本估算

### Free Tier (開發測試)
- Web Service: 750 小時/月
- PostgreSQL: 90 天到期後需升級
- **注意**：Free instance 閒置 15 分鐘後會休眠

### Starter Plan (正式環境)
- Web Service: $7/月
- PostgreSQL: $7/月
- 總計：約 $14/月

### Professional Plan (大流量)
- Web Service: $25/月起
- PostgreSQL: $20/月起
- 支援自動擴展、更高效能

## 安全建議

1. **JWT_SECRET 強度**：至少 32 字元隨機字串
2. **資料庫密碼**：使用 Render 自動產生的強密碼
3. **API Rate Limiting**：考慮使用 NestJS throttler 模組
4. **HTTPS**：Render 預設啟用 SSL/TLS
5. **環境變數保護**：不要將 `.env.production` commit 到 Git

## 回滾策略

如果部署後發現問題：

1. Render Dashboard → Deploys 分頁
2. 找到上一個穩定版本
3. 點選 "Rollback to this version"
4. 系統自動回滾到該版本

## 聯絡與支援

- Render 官方文件：https://docs.render.com
- Render 社群論壇：https://community.render.com
- 緊急問題：dashboard 右下角 Support Chat

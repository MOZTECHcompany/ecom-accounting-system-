# Render → Cloud SQL（PostgreSQL）停機遷移指南

本指南適用於「開發中允許停機」的情境，使用 `pg_dump` → `pg_restore` 做整庫搬移。

## 先回答：要不要乾脆重建資料庫？（開發中很常見）

這個專案目前 Prisma schema 規模不小（多模組、多表），但 **schema 與基礎資料大多可透過 migrations + seed 自動建立**。

如果你目前 Render DB 的資料「不重要」（例如只有測試帳號/密碼、或少量測試單據），通常更建議：

- ✅ **直接在 Cloud SQL 建新 DB**
- ✅ 用 `prisma migrate deploy` 建表
- ✅ 用 `npm run prisma:seed` 建立預設公司/角色/權限/預設管理員等基礎資料

你需要「搬移」的情況通常是：

- 你有想保留的測試資料（商品/庫存/訂單/會計分錄）
- 或你已經開始讓真實使用者操作，不想重建

下面提供「直接重建」最短流程。

### 0) 直接重建（不搬資料）

1. 在 Cloud SQL 建立新的 Database（例如：`ecom_dev`）與使用者（例如：`app_user`）
2. 把後端部署環境的 `DATABASE_URL` 指向 Cloud SQL
3. 在後端執行 migrations + seed：

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

完成後你會得到：

- 預設公司實體、角色與權限
- 預設管理員使用者（由 seed 產生）
- 其他系統必要的基礎資料

## 你需要準備

- Render 的 DB 連線字串：`RENDER_DATABASE_URL`
- Cloud SQL 的 DB 連線字串：`CLOUDSQL_DATABASE_URL`

建議使用環境變數，不要把密碼寫進檔案或貼到聊天室。

## 1) 停機（很重要）

為了避免 dump 期間資料變動導致不一致：
- 暫停後端服務（或至少暫停會寫入 DB 的功能，例如註冊/登入/建立訂單）

## 2) 安裝工具

在 Alpine（含 dev container）執行：

```bash
apk add --no-cache postgresql-client
```

需要的指令：`pg_dump`、`pg_restore`

## 3) Cloud SQL 連線準備

二選一：

### A. Public IP + Authorized networks（最快）

- 在 Cloud SQL → Connections → Add network
- 加入你執行遷移機器的對外 IP

### B. Cloud SQL Auth Proxy（更安全）

- 透過 Proxy 建立本機到 Cloud SQL 的安全通道
- 然後 `CLOUDSQL_DATABASE_URL` 會連到 `localhost:5432`

## 4) 執行一鍵遷移

在專案根目錄：

```bash
export RENDER_DATABASE_URL='postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require'
export CLOUDSQL_DATABASE_URL='postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require'

./backend/scripts/migrate-render-to-cloudsql.sh
```

可選參數：

```bash
DUMP_FILE=./render.backup YES=1 ./backend/scripts/migrate-render-to-cloudsql.sh
```

## 5) 切換應用程式

- 把後端部署環境的 `DATABASE_URL` 改成 Cloud SQL
- 若後端使用 Prisma，切換後建議跑：

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

## 6) 驗證（建議）

最基本檢查：

```bash
psql "$CLOUDSQL_DATABASE_URL" -c "\\dt"
```

如果你只在意帳號/密碼，請再針對使用者表做 count 驗證。

## 回滾策略（保險）

切換完成後，先不要立刻刪 Render DB，保留一段時間以便：
- 發現問題可以立刻把 `DATABASE_URL` 切回去

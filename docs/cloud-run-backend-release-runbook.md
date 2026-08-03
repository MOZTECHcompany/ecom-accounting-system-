# Cloud Run backend 安全發布手冊

## 目的

`.github/workflows/deploy-cloudrun-backend.yml` 不再把新建的 `LATEST`
revision 直接切成正式流量。每次發布必須依序完成：

1. 先比對本次變更。如果涉及 Prisma migration、Meta／Google Ads connector 或
   廣告品牌 mapping，自動 push workflow 會 fail closed；負責人必須先完成 Cloud SQL
   backup／相容性檢查，再手動執行 workflow 並勾選
   `approve_roll_forward_only_release`。
2. 用 commit SHA 建立 image tag，立刻解析成 immutable sha256 digest；後續部署與
   驗證只使用 digest。
3. 高風險發布在台北時間 `03:30` 至 `04:45` 禁止 stage，避開 Meta／Google
   每日同步。
4. 用唯一 revision suffix 建立 `0%` traffic 的 candidate，並只加本次 run 的 tag；
   不改 production Cloud Run IAM。
5. 證明原有正式流量沒有改變。
6. 驗證 candidate 是本次指定 revision、Cloud Run `Ready`、container 沒有不健康條件，
   且部署 digest 等於本次 build digest。
7. 從 exact revision logs 同時看到 `Migrations completed successfully.` 與
   `Successfully connected to database`；只要看到 migration／DB failure，或部署帳號
   無權讀 log，就 fail closed。workflow 不輸出 log body。
8. 從 candidate tag URL 驗證：
   - `/api-docs-json` 仍包含 health、Meta Ads readiness、Google Ads readiness 與
     connector readiness route。
   - `/api/v1/auth/login-entities` 是登入頁既有的公開唯讀查詢；必須成功回傳 JSON
     array，藉此驗證 candidate 能實際查詢 Cloud SQL。workflow 不輸出 array 內容。
   - `/api/v1/health` 若為公開 route，必須回覆本次 candidate revision；目前正式
     backend 的全域 JWT guard 會讓未登入請求回 `401`，workflow 會接受這個既有
     保護狀態。
   - 從 exact candidate revision 讀取 `SUPER_ADMIN_EMAIL` 與
     `SUPER_ADMIN_PASSWORD` 的 Secret Manager reference，只在 runner 記憶體中登入，
     不輸出密碼或 JWT；Meta、Google 與 report connector 必須全部
     `releaseReady=true`、所有已設定帳號都完成 live check、品牌覆蓋完整且沒有
     release blocker。
9. 在切流前再次驗證 candidate 仍是 `0%`，原正式流量仍完全不變。
10. 只把**本次已驗證的確切 revision**切成 `100%`；禁止使用浮動的
   `--to-latest`。
11. 只移除本次 candidate tag，保留不相關的既有 tagged URL；再確認 production
   control plane 的正流量只把 `100%` 指向本次 revision、image digest 相同且公開
   OpenAPI HTTP route 可用。health 若已公開，才額外核對其回覆 revision。

workflow 有 production concurrency lock。任何 gate 失敗都不會執行 promotion；
正常 runner failure path 的 cleanup step 只移除失敗 candidate 的本次 tag，不會自動
刪 revision、回切流量或執行資料修復。runner crash／job timeout 時 cleanup 只能是
best effort；維運者必須檢查並移除該 run 遺留的零流量 `cand-*` tag。

## 自動 gate 能證明與不能證明的範圍

自動 gate 會證明：

- 既有 Cloud Run IAM 已有 `allUsers`／`roles/run.invoker`；workflow 只讀驗證，
  candidate deploy 不修改 production IAM。
- Cloud Run revision／image 身分正確。
- candidate 在驗證前沒有正式流量。
- Cloud Run `Ready`、`ContainerHealthy`、`ContainerReady` 都是 `True`。
- exact revision startup logs 已證明 Prisma migration 完成、Prisma 已連上 DB，
  且沒有 migration／DB startup failure。
- candidate tag URL 可回傳有效 OpenAPI JSON，證明 HTTP application 已啟動。
- 既有公開 login-entities query 能回傳正確 JSON shape，證明 candidate 可完成
  唯讀 DB query；workflow 不保存或輸出查詢內容。
- Meta、Google Ads 與整體 connector readiness 的 route 已被編譯進 OpenAPI contract。
- 使用既有正式超級管理員帳號完成 authenticated readiness；不建立假使用者、不讀
  JWT signing secret、不把任何 token／密碼寫進 repository 或 log。暫存密碼檔採
  `0600` 並由 `EXIT` trap 清空刪除。

這個 gate 會即時讀取 Meta／Google 最近探測範圍，因此外部 API 暫時不可用時會
fail closed，不會切 production traffic。完整的 7／30 天花費同步與 Discord
Dashboard 仍屬發布後 end-to-end 驗收，不由這個 readiness gate 取代。

## campaign-granular 基線已完成：永久禁止退回舊 aggregate revision

2026-08-03 首次 campaign-granular 資料遷移已在正式 Cloud SQL 完成：

- 正式相容基線 revision 是 `ecom-accounting-backend-brand-reg-v2`。
- DB 已驗證為 `377` 筆 campaign-granular rows。
- 舊 account/day legacy aggregate 為 `0` 筆。

這代表 rollback 邊界已經跨過。**任何 production traffic 都不得再切到
`brand-reg-v2` 之前的 revision。** 舊程式可能重新產生
`accountRef:YYYY-MM-DD` 彙總 Expense，造成新舊資料重複計費或品牌歸屬倒退。
問題只能用 roll forward／reconcile 處理。

未來 candidate 驗證期間，讓目前的 `brand-reg-v2` 或其後相容 revision 保持
`100%` 正式流量是安全且必要的；candidate 仍維持 `0%`，直到全部 gates 通過。
若 candidate gate 失敗，production 留在 `brand-reg-v2` 或更晚 revision，不構成
rollback。workflow 自身沒有任何「指定舊 revision」的 rollback 路徑。

container 啟動會先執行 `prisma migrate deploy`，且 startup script 已改成 migration
失敗即退出；workflow 仍會用 exact revision logs 做第二層 fail-closed 驗證。
candidate 驗證期間現行 revision 仍會服務，因此未來 Prisma schema migration 必須是
**backward-compatible expand migration**。destructive／contract migration 不得走
此 workflow，必須拆成 expand → app roll-forward → contract 發布。

Meta Ads 會在台北時間 `04:17`、Google Ads 在 `04:27` 同步。workflow 會避開該
窗口，自動 probes 也不呼叫廣告 sync；但正式基線既已完成，任何後續資料或 mapping
異常都仍採以下方式處理：

1. production 保留在 `brand-reg-v2` 或更晚 revision，絕不指回更舊版本。
2. 找出失敗的確切 account／campaign／date 範圍。
3. 修正程式或權威 mapping，建置下一個 candidate。
4. 針對受影響區間 reconcile，確認 legacy aggregate 持續為 `0`，且 campaign rows
   沒有重複。
5. 重新通過同一套 candidate gates 後，roll forward 到修正版。

## 未來高風險發布前人工檢查

若變更涉及 Prisma、Meta／Google Ads connector 或廣告品牌 mapping：

1. 建立 Cloud SQL on-demand backup，記錄 backup ID 與建立時間；不要把憑證寫進 repo。
2. 確認所有 Prisma migration 都是 backward-compatible expand migration；不是的話
   停止，不得用此 workflow。
3. 手動執行 GitHub workflow，勾選 `approve_roll_forward_only_release`；push 事件
   不會自動 stage 這類高風險變更。所有手動 production dispatch 也一律需要勾選。
4. workflow 會自動避開台北時間 `03:30` 到 `04:45`；不要用其他手動 gcloud 指令繞過。
5. 記錄目前 Meta／Google 最近 7 天的來源狀態、幣別、row count、account coverage
   與 brand mapping coverage；不要保存 token 或原始廣告明細。
6. 確認權威帳號／品牌主檔已在目前 Cloud Run 設定中，而不是只存在本機檔案。
7. 確認負責人知道 production 不得退回 `brand-reg-v2` 之前，只能
   roll forward／reconcile。

GitHub WIF deployer 除原有 Cloud Run／Cloud Build 權限外，還必須能讀取 exact
revision logs（`logging.logEntries.list`，例如 project 層級
`roles/logging.viewer`），並對 candidate 使用的
`ecom-accounting-super-admin-password` 具備 `secretmanager.versions.access`
（建議只授予該一個 secret）。workflow 只判斷固定成功／失敗訊號，不會把 log body、
密碼或 JWT 寫入 GitHub log。

## 發布後管理員驗收

用既有管理員登入狀態完成，不把 JWT 貼進 GitHub Actions 或終端輸出：

1. Meta Ads readiness 為可讀，且 campaign-level mapping coverage 完整。
2. Google Ads readiness 為可讀，且 manager／client account routing 正確。
3. `reports/connector-readiness` 沒有新的 blocked connector。
4. 同一期間的 Meta 與 Google Ads 都出現在廣告報表，幣別沒有被跨幣別相加。
5. 每個 account／campaign 都只使用權威品牌 mapping；未對應項目維持 `待對應`，
   不依名稱猜品牌。
6. 新 Discord 任務同時產生雙平台摘要、可驗證的 HTML Dashboard 附件與正式 URL。

若任一項失敗，建立修正版並 roll forward；不要 rollback 到舊 revision。

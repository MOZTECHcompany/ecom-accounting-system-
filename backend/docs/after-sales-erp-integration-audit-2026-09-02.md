# 售後管理整併 ERP：唯讀盤點與功能保留規格

盤點日期：2026-09-02

## 決策

- 現有售後系統是正式業務規格，不是可丟棄的原型。
- 整併採「ERP 單一資料來源、售後模組化、舊系統唯讀過渡」。
- 不使用 iframe，不建立長期雙寫，不讓兩套系統同時改庫存、付款、退款或發票。
- 舊系統每項功能都必須有明確的 ERP 對應與驗收結果；未經使用者確認，不得因整併而刪除功能或商業規則。
- 正式資料寫入前一律先 dry-run、筆數核對與例外清單；無法確定的來源關聯維持待審，不自動猜測。

## 已驗證系統邊界

### GitHub 來源版本

- 售後系統功能保留基線為使用者指定的本機 commit `523792cdb1c07a324cfa2e52722eb1b145f3d8d4`；此版本是整併時不得遺失的最低驗收契約。
- 2026-09-02 fetch 後遠端 HEAD 為 `6ed5d6d14ea7db3449820621ccbffca570394077`。
- 本機 checkout 落後遠端 70 個 commits；不得直接 pull 覆蓋 `523792c` 後再假設差異已處理。這 70 個 commits 必須逐項視為候選修正，確認資料契約、權限與業務規則後才吸收。
- 這 70 個 commits 影響 97 個檔案，包含維修報價隊列、維修收款金額同步、保固來源查詢、ERP 商品搜尋 route、物流修正稽核、發票作廢／重開、付款與發票例外、來源通路設定及角色權限修正。
- 本文件的正式資料筆數來自 production database 唯讀查詢；程式功能以 `523792c` 為最低基線，遠端 `6ed5d6d` 的後續功能與修正另做差異驗收，不因 commit 較新就自動取得正式規則地位。
- ERP repository 遠端為 `https://github.com/moztechCEE/ecom-accounting-system-.git`。目前整併工作分支 `codex/erp-resume-20260825` 與其 GitHub 同名分支同在 `7f60c5e3`，相對 `origin/main` 為 ahead 20 / behind 0；本機另有未提交工作，後續不得用 pull、reset 或 checkout 覆蓋。

### 現有售後系統

- Cloud Run service：`moztech-after-sales-system`
- 正式 revision：`moztech-after-sales-system-00253-vfv`
- 目前承接 100% 流量。
- 使用獨立 PostgreSQL 資料庫、NextAuth 使用者、LINE / LIFF、付款憑證、綠界電子發票設定與保固資料來源。
- 商品服務名稱雖為 ERP product service，目前實作仍查詢售後系統自己的 `Product` 表，尚未呼叫 ERP 商品 API。
- 庫存處置目前保存 `WAREHOUSE`、`NO_STOCK_IN`、`SCRAPPED` 等業務判定，但未建立 ERP `InventoryTransaction`。
- 遠端新版另有保固來源資料庫唯讀搜尋，但仍是直接資料庫查詢；整併後應改為受權限保護的 ERP／保固服務 API，不讓瀏覽器或售後模組持有另一套資料庫的寫入責任。

### ERP 現有售後功能

- ERP 已有 `AfterSalesCase`、`AfterSalesCaseItem`、API 與 `/sales/after-sales` 頁面。
- 現有流程只有建立案件、付款連結、人工標記付款、會計確認、倉庫收件與出貨。
- 建構前的 `markPaid()` 會直接建立內部 `Invoice` 並標記 `issued`，未以綠界實際成功回應作為開票完成證據；第一個安全切片已拆除此耦合，但尚未部署。
- `confirmWarehouseReceived()` 與 `ship()` 目前只更新案件狀態與時間，沒有產生 ERP 庫存流水。
- 查詢摘要以最多 500 筆已載入明細計算，不代表完整條件範圍。
- 建立 API 使用未定型的 request body，角色與狀態限制尚未達到舊售後系統的完整程度。

## 正式售後資料唯讀基準

擷取時間：2026-09-02 16:12（Asia/Taipei）

| 項目 | 數量 |
|---|---:|
| 全部案件 | 613 |
| 有效案件 | 499 |
| 軟刪除案件 | 114 |
| 商品明細 | 682 |
| 正向物流 | 371 |
| 逆物流 | 284 |
| 付款紀錄 | 268 |
| 付款請求 | 326 |
| 付款提交 | 224 |
| 退款紀錄 | 51 |
| 發票紀錄 | 521 |
| 時間軸事件（全 entityType） | 4,911 |
| 稽核紀錄（全 entityType） | 5,138 |
| FAQ | 307 |

有效案件類型：

| 類型 | 數量 |
|---|---:|
| 漏寄補寄 | 66 |
| 私下購買 | 131 |
| 來回件／換貨退回 | 67 |
| 退款派車 | 58 |
| 維修 | 177 |

資料品質邊界：

- 499 筆有效案件都有時間軸與稽核紀錄。
- 75 筆 `CaseItem.productId` 為空，屬歷史商品或匯入資料；必須用 SKU／明確對照表人工確認，不以名稱或金額模糊配對。
- `Customer` 為 0 筆，但案件保留聯絡人快照；這符合目前「直接填聯絡資料、不強制綁客戶主檔」的既有設計。遷移時不得因此丟棄聯絡資料。
- 附件與獨立 Note 表目前皆為 0 筆，但功能仍列入保留範圍，不能因目前沒有資料而刪除。
- 海外購買目前以私下購買的海外付款／物流變體呈現，正式整併時需保留畫面與規則，不應只依 `CaseType` 數量判定為不存在。

## 必須完整保留的功能

### 案件與工作台

- 全部案件、角色待辦、急件、逾期、卡單與責任角色。
- 案件建立、編輯、詳細頁、搜尋、篩選、排序、分頁、軟刪除與鎖定狀態。
- 每筆案件唯一且明確的下一步、不能執行的原因、時間軸與可讀稽核差異。
- 內部備註與客戶可見備註。

### 案件類型與專屬欄位

- 漏寄補寄：原因、損耗分類、是否收款、零元規則與補寄出貨。
- 私下購買：付款區域、收款帳號、幣別、匯率、運費、最終應收、發票與銷庫資訊。
- 海外購買：國家、幣別、海外收款帳號、發票、物流與報關備註。
- 來回件：逆物流、收件、入庫單號、庫存處置與回收品狀態。
- 退款派車：逆物流、退款方式、退款金額、發票作廢／折讓與結案限制。
- 維修：產品／序號、購買資訊、收件、檢測、人損、保固、報價、同意／拒修、維修與寄回。
- 客戶問題與 FAQ：問題分類、內容、分析、知識整理與既有 FAQ 同步能力。

### 物流、付款、發票與外部入口

- 正向物流、逆物流、物流單號手動／匯入來源、批次資訊與匯出。
- 未收款不可出貨；收款確認與出貨為獨立動作。
- LINE / LIFF 付款連結、付款提交、匯款資訊、付款憑證、補件、確認、拒絕與通知。
- 發票待辦、綠界開立、查詢、作廢、批次匯出與原始證據。
- 退款與發票作廢／折讓必須分別有正式完成證據。
- 使用者、角色、模組權限、客戶、商品、匯入、匯出、設定與 LINE 品牌設定。
- 遠端新版新增的維修報價工作隊列、錯買來回件、保固來源搜尋、物流修正稽核、發票不開／作廢／重開與 ECPay 失敗資訊也屬必須保留範圍。

## ERP 目標資料責任

| 領域 | 正式資料擁有者 | 售後模組責任 |
|---|---|---|
| 法人、使用者、角色 | ERP | 使用 ERP session、entity 與權限 |
| 商品、SKU、保固序號 | ERP | 保存案件建立當下快照，引用正式 product ID |
| 客戶與原始訂單 | ERP | 引用正式 customer / sales order；仍保存聯絡快照 |
| 售後案件與專屬欄位 | ERP 售後模組 | 單一案件聚合根與狀態機 |
| 正向／逆向物流 | ERP 售後模組 | 保存物流流程並觸發正式庫存動作 |
| 庫存 | ERP Inventory | 只接受經驗證的收貨、出貨、移倉、報廢事件 |
| 付款與對帳 | ERP Payment / Reconciliation | 售後案件只引用付款，不自行宣告入帳 |
| 發票 | ERP Invoice / Invoicing | 售後案件只引用真實 provider 結果 |
| 退款與分錄 | ERP 財務模組 | 退款確認後建立沖銷／折讓／會計事件 |
| LINE / LIFF | 暫留薄型外部入口 | 只呼叫 ERP API，不直接改另一套資料庫 |
| 附件 | GCS + ERP metadata | 保存案件、上傳者、雜湊、類型與權限 |

## 必須落在底層的流程規則

每個流程命令必須依序執行：

1. 驗證 entity、權限、案件類型與目前狀態。
2. 驗證前置證據，例如實際收款、實際收件或綠界回應。
3. 以唯一 idempotency key 執行動作，重送不得重複扣庫存、開票或退款。
4. 在同一資料庫交易內更新案件、關聯紀錄、Timeline 與 Audit。
5. 外部 API 動作保存 request reference、provider response ID、成功／失敗狀態與可重試資訊；不得先把內部資料標成完成。

庫存規則：

- 建案不改庫存。
- 補寄／換貨先保留庫存，實際出貨確認後才出庫。
- 回寄收件後依處置分流：良品入庫、維修／隔離倉、報廢、不入庫。
- 換貨拆成「退回入庫」與「替換品出庫」兩筆，不以淨額合併。
- 庫存錯誤使用反向交易沖銷，不刪除原始交易。

付款與發票規則：

- 「付款已確認」不等於「發票已開立」。
- 付款狀態必須引用付款平台、銀行或經授權的人工確認證據。
- 綠界回傳正式發票號碼與成功狀態後，ERP 才能標記 `issued`。
- 退款、作廢與折讓各自保存 provider 狀態；任何一項失敗都不得提前結案。

## 遷移與切換階段

### 第一階段：目的模型與 dry-run 匯入

- 補齊 ERP 售後案件類型、detail、正逆物流、維修、退款、附件、Timeline 與 Audit 結構。
- 每筆舊資料加入 `sourceSystem=legacy_after_sales` 與唯一 `sourceRecordId`。
- 匯入先進 staging，輸出筆數、checksum、缺欄位、重複、未對應商品與狀態例外，不寫正式資料。

### 第二階段：唯讀影子比對

- ERP 顯示匯入候選與舊系統逐筆連結。
- 比對案件數、類型、狀態、金額、物流、發票與 timeline。
- 75 筆未連產品商品先進人工 mapping queue。

### 第三階段：單一寫入切換

- 新案件只寫 ERP；舊系統改為唯讀。
- LINE / LIFF 暫時保留，但所有命令改呼叫 ERP API。
- 不進行雙寫；失敗命令留在可重試隊列，不回頭寫舊資料庫。

### 第四階段：庫存與財務啟用

- 先在測試案件證明出貨、收貨、報廢、退款、開票皆冪等。
- 核對 ERP 庫存流水、Payment、Invoice、Journal 與 provider 證據後，才允許正式自動化。

### 第五階段：舊系統退役

- 舊系統保留唯讀查詢與匯出一段驗收期。
- 完成總筆數、狀態、金額、庫存影響、發票與稽核資料核對後，再另行確認是否停用服務；本規格不授權刪除舊資料或服務。

## 第一批實作優先序

1. 移除 ERP 售後 `markPaid()` 自動製造已開立發票的耦合，改成付款與開票兩個獨立狀態與命令。
2. 建立完整 CaseType / CaseStatus 狀態機、typed DTO、角色權限、Timeline 與 Audit 共用交易邊界。
3. 建立正逆物流與庫存處置模型，但先以 dry-run 驗證，不啟用正式庫存寫入。
4. 建立 legacy 唯讀 exporter、staging parser、source key、checksum 與 75 筆商品 mapping queue。
5. 將既有售後畫面以 ERP 的單一「售後管理」入口重建，保留角色工作隊列與全部專屬流程。
6. 最後才切換 LINE / LIFF、綠界發票與正式庫存交易。

## 2026-09-02 第一個建構切片

- `523792c` 功能驗收基線與隔離的遠端候選 `6ed5d6d` 都已加入受 `ERP_INTEGRATION_API_KEY` 保護的唯讀 API：health、案件增量清單與案件完整明細；後續 migration 以遠端候選的完整欄位為來源，但不得遺失基線功能。
- 唯讀 exporter 明確選取安全的使用者欄位，不輸出 `passwordHash`、登入節流或任何 provider 密鑰；付款、退款、發票、正逆物流、附件 metadata、Timeline、Audit 與 Note 保留供逐筆核對。
- ERP backend 新增 `AfterSalesIntegrationModule` 與 legacy adapter，正式對前端只提供 `/api/v1/after-sales/*`；舊系統服務金鑰只由 backend 讀取，不下放瀏覽器。
- ERP 查詢受 JWT 與角色限制；授權、網路或逾時失敗均視為明確失敗，不回傳空清單冒充同步成功。
- 已建立 ERP 售後完整類型／狀態契約與來源 payload 稽核器，包含穩定 checksum、日期／數量／金額驗證、未知類型與狀態拒絕、重複來源識別，以及缺商品 mapping 的人工待審原因。
- 已建立 `AfterSalesImportRun`、`AfterSalesImportCandidate` 暫存模型與尚未套用的 Prisma migration。`migration/preview` 與 `migration/preview-page` 完全不寫入；`migration/stage-page` 只允許管理員把來源快照、checksum、問題與保留期限寫入 staging，不會建立正式售後案件或觸發庫存、付款、退款、發票。
- ERP 原生 `markPaid()` 已從底層移除「確認付款時製造已開立發票」的耦合，並補上付款、會計收件、倉庫收件與出貨階段守門及重試冪等；付款確認現在只轉入會計處理，不宣稱已入帳或已開票。
- 建立案件、設定商品付款與出貨入口已改用 typed DTO；未知欄位、無效 UUID、空商品清單、負數金額、無效日期與超長欄位會在進入 domain service 前被拒絕。
- 目前沒有建立正式服務金鑰、沒有套用 migration、沒有部署，也沒有改動正式庫存、付款、退款或發票資料。
- 驗證：兩個舊售後候選的 Next production build 與 lint 通過；隔離候選 auth test 1/1 通過；ERP backend 全量 33 suites / 119 tests、售後切片 5 suites / 18 tests、production build 與 frontend production build 通過；Prisma format、validate、generate 通過且未連線或變更資料庫。
- 舊售後依賴樹目前有 29 個已知 npm audit 項目（3 low、7 moderate、18 high、1 critical），必須在正式部署前逐項處理或確認可接受的鎖版風險，不以 `audit fix --force` 直接改壞相依契約。

## 2026-09-02 staging 驗證結果

- 正式售後與 ERP backend revision 均未改動；此次只新增 IAM 保護的售後 exporter staging、ERP backend staging、隔離資料庫、migration job、bootstrap job 與 staging secrets。
- exporter staging revision 為 `moztech-after-sales-exporter-staging-00001-lt5`，啟動時跳過 migration / bootstrap，且未授權請求為 HTTP 403。ERP staging revision 為 `ecom-accounting-backend-after-sales-staging-00002-n44`，端到端 readiness 為 HTTP 200、`connected=true`、`mode=read_only`、`sourceCommit=6ed5d6d`、`featureBaseline=523792c`。
- 空白 staging database 成功套用 52 個 Prisma migrations。過程中從底層修正歷史 raw seed SQL 缺 UUID 主鍵，以及 bootstrap 未使用共用 Cloud SQL URL 組裝邏輯；成功 executions 為 `ecom-accounting-after-sales-staging-migrate-ncvd5` 與 `ecom-accounting-after-sales-staging-bootstrap-8bhvj`。
- 即時來源已由較早基準的 613 / 499 增加為 614 / 500；新增的是 1 筆有效私下購買案件。全量 dry-run：487 筆可進候選、13 筆需待審、114 筆軟刪除、75 個商品明細需 mapping。
- 第一次全量 staging 建立 614 筆；第二次相同來源重跑為 `created=0`、`updated=0`、`unchanged=614`。正式 `AfterSalesCase` 仍為 0，沒有庫存、付款、退款或發票寫入。
- 614 筆 case-scoped payload 含商品 684、正向物流 371、逆物流 286、付款紀錄 270、付款請求 328、付款提交 225、退款 51、發票 522、CASE Timeline 4,710、CASE Audit 4,374。另一次直接分組查詢證明目前整張來源表為 Timeline 4,930（CASE 4,710、INVOICE 220）與 Audit 5,157（CASE 4,374，其餘 FAQ / INVOICE / PRODUCT / SHIPMENT / SYSTEM / USER 共 783）；exporter 只把 CASE 歷程放進案件 payload，差額是其他 entityType，不是遺失。
- 最終 staging image digest 為 `sha256:21b72502d63bf232bb27b5f96ff39423f9e17fd2a68fb8fe8f45b97f181eada7`，Cloud Build `839fbb8d-1cce-437c-bd39-5f5ea8efadc6` 成功；相關 6 suites / 24 tests、backend build 與 diff check 通過。
- 隔離、乾淨且尚未 push 的本機追溯 commits 為 ERP `fa73e85e` 與售後 exporter `7dfa2a5`；主工作目錄的既有未提交內容未被混入這兩個 commits。

## 正式切換驗收門檻

- 以正式切換快照高水位為準，所有來源案件都能對應為已匯入、已軟刪除或有明確待審原因；2026-09-02 最新驗證基準為 614 筆。
- 有效案件類型與狀態筆數一致；2026-09-02 最新驗證基準為 500 筆。
- Timeline 與 Audit 不遺失；歷史操作者無法對應時保留來源名稱，不冒充 ERP 員工。
- 所有付款、退款、發票金額及狀態分開核對，沒有以案件金額推測入帳。
- 所有庫存異動都有 warehouse、product、quantity、source case、event、idempotency key 與沖銷能力。
- 75 筆未連產品商品全部完成明確 mapping 或維持待審，不自動配對。
- 重跑匯入的新增筆數為 0。
- 正式切換前需加入一致的 `snapshotAt` / high-watermark 契約，避免來源在分頁過程新增或更新時把正常增量誤判為遷移差異。
- 舊系統進入唯讀後，新案件與外部入口只寫 ERP。
- 正式自動開票、退款與庫存寫入需另經測試收據與使用者確認；文件完成不代表已取得交易授權。

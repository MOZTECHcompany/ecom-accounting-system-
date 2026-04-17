# AI 電子商務營運中樞 Closeout Handoff - 2026-04-18

## 目的

這份文件用來盤點目前系統中：

1. 尚未完成的所有項目
2. 已有骨架、但還沒真正落地的部分

目標不是單純列 TODO，而是整理成後續可以正式收尾的實作清單，讓系統逐步達成：

- 自主對帳
- 自動追蹤發票與應收帳款
- 自動辨識未收款、未撥款、未入帳
- 成為可支援 CEO / 財務 / 會計 / 營運的全公司營運中樞

---

## 一、目前已完成的基礎

### 1. 電商通路底座

- Shopify 訂單 / 交易同步已可用
- 1Shop 訂單 / 收款同步已可用
- Shopline integration 骨架已建立
- Dashboard 已可分通路顯示部分業績
- 綠界 merchant 已分流：
  - `3290494` -> Shopify / MOZTECH 官網
  - `3150241` -> 團購 / 1Shop / 未來 Shopline

### 2. 對帳底座

- `SalesOrder / Payment / Customer / SalesChannel` 主資料模型已存在
- 綠界 Shopify payout import 已可跑
- provider payout matching 已可部分回填實際手續費
- AR monitor / reconciliation feed / executive overview 已有初版
- 綠界服務費發票匯入與 AP 摘要 API 已補上

### 3. 會計底座

- 會計科目
- 會計分錄查詢
- 會計期間查詢 / 關帳 / 鎖帳基礎
- 試算表
- 總分類帳
- 手動分錄

### 4. 營運管理底座

- CEO Dashboard 初版
- 異常待辦初版
- 銷售訂單頁、客戶管理頁已接部分真實資料
- 人資 / 薪資 / 出勤管理已有可用基礎

---

## 二、尚未完成的所有項目

以下項目是「系統目標明確，但功能尚未完成」。

### A. 發票主線

#### A-1. 銷售發票與綠界電子發票未完全打通

目前已做到：

- 內部發票模組可建立發票
- AP 可管理綠界服務費發票
- 1Shop 可讀到部分原始 receipt 發票欄位

仍未完成：

- 每筆 Shopify / 1Shop / Shopline 訂單，對應的綠界電子發票狀態查詢
- 已開立 / 未開立 / 作廢 / 折讓 狀態同步
- 綠界正式發票號碼、發票日期、隨機碼寫回訂單層
- 訂單頁、AR 頁、Dashboard 對發票狀態的一致顯示
- 發票作廢 / 折讓 對應會計與對帳影響

#### A-2. 發票號碼與字軌管理仍是簡化版

未完成：

- 正式字軌管理
- B2B / B2C 完整差異
- 外部電子發票平台正式串接

---

### B. 應收帳款（AR）主線

#### B-1. 訂單 -> AR -> 收款 -> 沖銷 沒有完全閉環

目前已做到：

- AR monitor
- 部分 AR 建立與監控
- 部分欄位已進 Dashboard

仍未完成：

- 銷售訂單穩定自動建立 `ArInvoice`
- 收款成功後自動沖銷 AR
- 逾期未收款的 aging / due report
- 催收通知
- 呆帳 / 備抵呆帳 / write-off
- 折讓、退款對 AR 的完整影響

#### B-2. AR 分錄仍未完整自動化

未完成：

- 銷售分錄自動建立
- 收款分錄自動建立
- 呆帳分錄
- AR 與發票、收款、Journal 的一致性檢查

---

### C. 自主對帳主線

#### C-1. 綠界歷史回補與 matching 尚未完成

目前已做到：

- `3290494` 可回補
- 2026 部分資料已 matched
- 手續費已開始回填

仍未完成：

- 2025 以前 Shopify 歷史主檔回補
- 回補後重跑綠界 matching
- `3150241` 非 Shopify merchant 的對帳策略
- 歷年 unmatched 工作台
- 手動確認 / 人工匹配 UI

#### C-2. 1Shop 歷史回補與對帳尚未完成

目前已做到：

- 1Shop 現代區間資料可同步
- 系統中已有部分 1Shop 訂單與收款

仍未完成：

- 1Shop 歷年資料分段回補
- 1Shop 訂單對綠界資料的完整 matching
- 1Shop 訂單對電子發票狀態核對

#### C-3. Shopline 對帳未完成

仍未完成：

- Shopline 正式 token / handle 串接
- 歷史訂單 / 顧客同步
- payout / settlement
- webhook 簽章驗證
- reconciliation 進既有鏈路

---

### D. 會計分錄與固定報表

#### D-1. 分錄自動化不完整

目前已做到：

- 手動分錄
- 撥款分錄部分自動建立

仍未完成：

- 銷售收入分錄完整自動化
- 收款沖帳分錄完整自動化
- AP 分錄完整自動化
- 薪資分錄完整化
- COGS 分錄
- 折舊分錄
- 退款 / reversing journal

#### D-2. 固定會計報表不完整

目前已做到：

- 試算表
- 總分類帳

仍未完成：

- 正式損益表
- 正式資產負債表
- 現金流量表
- 權益變動表
- 比較期間
- 預算比較
- 報表匯出 PDF / XLSX

---

### E. AP / 銀行 / 出款

#### E-1. AP 還沒有完整閉環

目前已做到：

- AP 發票基本功能
- 綠界服務費發票 AP 匯入

仍未完成：

- `createApFromExpenseRequest`
- `markAsPaid`
- `getDueReport`
- `applyDiscount`
- AP 分錄
- AP 付款分錄
- 銀行帳戶關聯

#### E-2. 銀行自動對帳未完成

未完成：

- 銀行對帳單匯入
- 自動配對銀行交易與收付款
- 手動對帳
- 帳面餘額 vs 銀行餘額
- 虛擬帳號自動配對訂單

---

### F. Dashboard / 營運總控台

#### F-1. CEO Dashboard 仍是初版

目前已做到：

- 部分經營總覽
- 部分異常待辦
- 部分 AI 洞察

仍未完成：

- 發票完整性總覽
- AR 逾期總覽
- 未收款總覽
- 未撥款總覽
- 已對帳未入帳總覽
- 每日主動提醒
- 異常優先級排序
- drill-down 與各模組連動

#### F-2. 銷售訂單頁仍需深化

目前已做到：

- 真實資料接入
- 時間篩選改版
- 緊湊列表
- 手續費 / 淨額顯示

仍未完成：

- 綠界電子發票狀態直接顯示
- 歷史回補後數據校準
- 對帳 badge / 發票 badge / 入帳 badge 完整化

---

### G. 人資 / 薪資 / 核准流

#### G-1. 薪資仍是最小可用版

未完成：

- 新進 / 離職比例計薪
- reverse payroll
- 細部負債科目拆分
- 實際銀行帳戶映射
- 正式薪資單樣板

#### G-2. 權限 / 審批流未完成

未完成：

- 部門主管審核
- 多層審批規則
- 審批通知
- 審批歷史完整化

---

### H. 成本 / 存貨

#### H-1. 成本模組仍多為骨架

未完成：

- 開發成本記錄
- 攤提規則
- COGS 計算
- 批次成本追蹤
- 標準成本 vs 實際成本

---

## 三、骨架中還沒做完的部分

以下是程式碼裡已存在服務 / 模組 / API，但仍屬於骨架或半成品。

### 1. `backend/src/modules/ar/ar.service.ts`

骨架未完成：

- 自動產生 AR 分錄
- 自動產生收款分錄
- 呆帳分錄
- 催收通知

### 2. `backend/src/modules/ap/ap.service.ts`

骨架未完成：

- `createApFromExpenseRequest`
- `markAsPaid`
- `getDueReport`
- `applyDiscount`
- AP 分錄 / 付款分錄

### 3. `backend/src/modules/banking/banking.service.ts`

骨架未完成：

- CSV 對帳單匯入
- 自動對帳
- 手動對帳
- 餘額調節
- 虛擬帳號配對

### 4. `backend/src/modules/reports/reports.service.ts`

骨架未完成：

- 正式財報邏輯
- 報表匯出
- 自訂分析報表
- 渠道 / 商品 / 客戶深度分析

### 5. `backend/src/modules/sales/services/sales-order.service.ts`

骨架未完成：

- `applyRefund`
- `postOrderToAccounting`
- `createMockOrder`
- 正式收入分錄鏈

### 6. `backend/src/modules/accounting/accounting.service.ts`

骨架未完成：

- `generateCOGS`
- `generateDepreciation`

### 7. `backend/src/modules/cost/cost.service.ts`

骨架未完成：

- 開發成本
- 攤提
- COGS
- 批次成本分析

### 8. `backend/src/modules/expense/expense.service.ts`

骨架未完成：

- `linkToApInvoice`
- `getExpensesByCategory`
- 付款記錄與分錄

### 9. `backend/src/modules/approvals/approvals.service.ts`

骨架未完成：

- 自動指派審批人
- 通知
- 完整審批記錄
- 審批規則

### 10. `backend/src/modules/integration/shopline/`

骨架未完成：

- settlement / payout
- 正式 webhook 驗證
- reconciliation 回填

### 11. `backend/src/modules/invoicing/invoicing.service.ts`

骨架未完成：

- 外部電子發票平台正式串接
- 正式字軌管理

---

## 四、目前系統最重要的真實缺口

如果只抓最影響「像合格會計師」能力的缺口，目前是這五條：

1. `訂單 -> 發票` 還沒有完全核實
2. `訂單 -> 應收 -> 收款 -> Journal` 還沒全部閉環
3. `平台 / 金流 -> 撥款 -> 手續費 -> AP / 對帳` 還沒全部閉環
4. `歷年資料回補` 還沒完成，導致歷史 unmatched 偏高
5. `Dashboard 警示` 還沒真正做到每日主動追蹤所有異常

---

## 五、正式收尾順序建議

### Sprint 1：把對帳主線補齊

1. Shopify 歷史主檔回補
2. 綠界 `3290494` 歷史重新 matching
3. 1Shop 歷史回補
4. `3150241` 綠界策略確認與回補
5. unmatched 工作台

### Sprint 2：把發票 / AR / Journal 補齊

1. 綠界電子發票狀態核對
2. 訂單發票狀態寫回
3. AR 自動建立
4. 收款沖帳
5. Journal 自動落帳

### Sprint 3：把 AP / Banking / 付款補齊

1. AP 分錄
2. 銀行對帳單匯入
3. 自動銀行對帳
4. AP 付款閉環

### Sprint 4：把固定財報與 CEO 總控台補齊

1. 正式財務報表
2. 異常優先級
3. 每日 AI briefing
4. drill-down / 匯出

---

## 六、目前應先正式開工的項目

若要從現在開始正式更改，建議第一批直接做：

1. Shopify 歷史回補正式上線並執行
2. 綠界歷史資料重跑 matching
3. 1Shop 訂單的綠界電子發票狀態查詢
4. AR 自動建立與 Journal 補齊
5. Dashboard 發票 / 未收款 / 未撥款 / 未入帳異常整合

---

## 七、文件用途

這份 hand-off 文件可作為：

- closeout checklist
- 下階段 sprint backlog
- 交接文件
- 之後驗收「哪些已完成、哪些仍未完成」的主清單


# AP Integration & UX Improvement Report

## Overview / 概要
Successfully integrated "Expense Requests" into the "Accounts Payable" (AP) module and improved UX to handle mixed data types (Vendor Invoices vs. Employee Reimbursements).
成功將「費用申請」併入 AP 模組，並優化 UX 以同時處理供應商發票與員工報銷兩種資料型態。

## Changes Implemented

### 1. Backend Integration (`backend/src/modules/ap/ap.service.ts`)
- **Unified Data Stream**: `getInvoices` now returns both standard vendor invoices and auto-generated payment tasks (from approved expense requests) in a single list.
- **Source Identification**: API response includes `source` to distinguish `ap_invoice` vs. `payment_task` so the frontend can render context-aware UI.
- **Payment Logic**: `recordPayment` routes writes to `ApInvoice` or `PaymentTask` tables based on the ID prefix, preventing schema mismatch.
- **Data Shape Alignment**: Payment tasks fill missing vendor info with `EMP-REIMBURSE` placeholders to keep list rendering resilient.

### 1. 後端整合重點
- **資料串流統一**：`getInvoices` 單一 API 輸出供應商發票與報銷任務。
- **來源標示**：回傳 `source` 欄位區分 `ap_invoice` / `payment_task`，供前端判斷 UI。
- **付款分流**：`recordPayment` 依 ID 前綴分流至 `ApInvoice` 或 `PaymentTask`，避免寫入錯表。
- **資料健全性**：報銷任務缺少廠商資訊時以 `EMP-REIMBURSE` 佔位，確保列表不破版。

### 2. Frontend UX Enhancements (`frontend/src/pages/ApInvoicesPage.tsx`)
- **Visual Distinction**: Invoice column adds tags — Blue `員工報銷` (payment task), Cyan `進貨發票` (vendor invoice).
- **Action Safety**: `Update Schedule` is hidden for payment tasks to avoid invalid recurring flows; `Record Payment` works for both types.
- **Resilient Rendering**: Tag logic driven by `source`, so new sources can plug in without breaking the table.

### 2. 前端體驗強化
- **清楚標示**：發票欄位加上標籤，藍色代表員工報銷、青色代表進貨發票。
- **操作防呆**：報銷任務不顯示「更新排程」，避免進入不支援的循環付款；「記錄付款」兩類都可用。
- **可擴充性**：透過 `source` 判斷標籤與操作，未來新增來源可共用同一列表框架。

### 3. Type Definitions (`frontend/src/types/index.ts`)
- `ApInvoice` interface includes optional `source` to keep type-safety end to end.

### 3. 型別定義
- `ApInvoice` 介面新增可選 `source`，確保型別安全貫穿前後端。

## Verification / 驗證
- **Action gating**: Confirmed `updateInvoice` UI is hidden for `payment_task`; backend not invoked for unsupported flow.
- **Data integrity**: Payment tasks without vendors render with `EMP-REIMBURSE` placeholder; no null-based crashes in table mapping.
- **Visual check**: List shows clear tag-based separation between reimbursements and vendor bills.
- **Regression sweep**: Smoke-tested invoice search/sort and payment recording for both sources; no API contract regressions observed.

## Notes & Next Steps / 備註與後續
- Consider adding filter chips to toggle `ap_invoice` vs `payment_task` for faster triage.
- Add e2e coverage for mixed-source tables to prevent regression on tag logic and action gating.
- If recurring payment support is ever added for `payment_task`, re-enable schedule UI behind a capability flag.

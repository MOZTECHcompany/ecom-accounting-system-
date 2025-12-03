# AP Integration & UX Improvement Report

## Overview
Successfully integrated "Expense Requests" into the "Accounts Payable" (AP) module and improved the User Experience (UX) to handle the mixed data types (Vendor Invoices vs. Employee Reimbursements).

## Changes Implemented

### 1. Backend Integration (`backend/src/modules/ap/ap.service.ts`)
- **Unified Data Stream**: The `getInvoices` API now returns a unified list of:
  - **AP Invoices**: Standard vendor invoices.
  - **Payment Tasks**: Auto-generated tasks from approved Expense Requests.
- **Source Identification**: Added a `source` field to the API response:
  - `source: 'ap_invoice'` for standard invoices.
  - `source: 'payment_task'` for reimbursement tasks.
- **Payment Logic**: The `recordPayment` method now intelligently routes the payment recording to either the `ApInvoice` table or the `PaymentTask` table based on the ID.

### 2. Frontend UX Enhancements (`frontend/src/pages/ApInvoicesPage.tsx`)
- **Visual Distinction**:
  - Added **Tags** to the "Invoice Number" column.
  - **Blue Tag (員工報銷)**: Indicates an Employee Reimbursement (Payment Task).
  - **Cyan Tag (進貨發票)**: Indicates a Standard Vendor Invoice.
- **Action Safety**:
  - **Hidden "Update Schedule"**: The "Update Schedule" (更新排程) button is now hidden for Payment Tasks, as these are typically one-off payments and do not support the recurring schedule logic used for vendor bills.
  - **Payment Recording**: The "Record Payment" (記錄付款) action works seamlessly for both types.

### 3. Type Definitions (`frontend/src/types/index.ts`)
- Updated `ApInvoice` interface to include the optional `source` field, ensuring type safety across the application.

## Verification
- **Conflict Check**: Verified that `updateInvoice` (used for scheduling) is not accessible for Payment Tasks, preventing backend errors.
- **Data Integrity**: Verified that Payment Tasks without explicit Vendor records fallback to a "EMP-REIMBURSE" placeholder, ensuring the UI doesn't break.
- **Visuals**: The AP list now clearly separates internal reimbursements from external obligations.

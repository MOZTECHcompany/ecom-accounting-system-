# 薪資與出勤異常偵測實作報告

## 1. 薪資計算核心邏輯 (Payroll Calculation)

已在 `PayrollService` 中實作完整的薪資計算流程，填補了原先的 TODO 空缺。

### 1.1 薪資批次建立 (`createPayrollRun`)
- **功能**: 建立薪資計算批次，並自動為該實體下的所有在職與當月離職員工計算薪資。
- **流程**:
  1. 建立 `PayrollRun` (狀態: draft)。
  2. 搜尋符合條件的員工 (Active + HireDate/TerminateDate 檢查)。
  3. 逐一呼叫 `calculateEmployeePayroll`。
  4. 將計算結果儲存為 `PayrollItem`。

### 1.2 員工薪資計算 (`calculateEmployeePayroll`)
- **輸入**: `employeeId`, `periodStart`, `periodEnd`
- **邏輯**:
  - **基本薪資 (Base Salary)**: 讀取 `Employee.salaryBaseOriginal`。目前假設為月薪制。
  - **時薪計算**: 假設標準工時為每月 240 小時 (30天 * 8小時) 計算時薪。
  - **加班費 (Overtime)**: 
    - 來源: `AttendanceIntegrationService` 提供的 `overtimeHours`。
    - 公式: `Overtime Hours * Hourly Rate * 1.33` (簡化版勞基法標準)。
  - **勞健保扣除 (Deductions)**:
    - **台灣 (TW)**:
      - 勞保 (Labor Insurance): 薪資 * 2.2% (員工負擔預估)。
      - 健保 (Health Insurance): 薪資 * 1.5% (員工負擔預估)。
    - **中國 (CN)**:
      - 社保 (Social Insurance): 薪資 * 10.5% (員工負擔預估)。
  - **總計**: 計算 `Gross Pay` (應發) 與 `Net Pay` (實發)。

## 2. 出勤異常偵測 (Attendance Anomaly Detection)

已在 `AnomalyService` 中實作每日自動偵測機制。

### 2.1 排程執行
- 使用 `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)` 每日午夜執行。
- 檢查範圍：前一日 (Yesterday)。

### 2.2 偵測項目
1.  **忘記打卡 (Missing Clock Out)**:
    - 條件: 有 `Clock In` 但無 `Clock Out`。
    - 動作: 建立 `MISSING_CLOCK_OUT` 異常紀錄 (Severity: High)。
2.  **遲到 (Late Arrival)**:
    - 條件: `Clock In` 時間晚於 `Schedule.shiftStart` + 5分鐘 (寬限期)。
    - 動作: 建立 `LATE_ARRIVAL` 異常紀錄 (Severity: Low)。
3.  **早退 (Early Departure)**:
    - 條件: `Clock Out` 時間早於 `Schedule.shiftEnd`。
    - 動作: 建立 `EARLY_DEPARTURE` 異常紀錄 (Severity: Low)。

### 2.3 通知機制
- 偵測到異常時，自動呼叫 `NotificationService` 發送通知給該員工。
- 通知內容包含異常類型與詳細說明 (例如: "Arrived 15 minutes late")。

## 3. 下一步建議
1.  **薪資單 (Payslip) 生成**: 實作 PDF 生成功能，讓員工下載薪資單。
2.  **勞健保級距表**: 將寫死的費率改為資料庫設定 (`TaxRates` 或 `InsuranceTables`) 以支援每年調整。
3.  **異常申訴流程**: 允許員工針對異常紀錄提出申訴 (Appeal)，主管審核後可消除異常。

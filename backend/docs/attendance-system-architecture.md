# Attendance & Leave System Architecture

## 1. Objectives
- Provide a compliant, auditable attendance platform for Taiwanese entities covering clock-in/out, leave workflows, and anomaly detection.
- Enforce geo/IP/location restrictions for office punches while supporting mobile punches with GPS proof.
- Centralize leave policies (sick, personal, annual, menstrual, marriage, bereavement, maternity, paternity, compensatory) with supporting documents and approvals.
- Feed downstream modules (Payroll, Approvals, Notifications, AuditLog) without disrupting existing accounting flows.

## 2. Key Requirements Recap
| Area | Details |
| --- | --- |
| Clocking | Support start/end + break punches from mobile, kiosk, and web; require GPS + IP validation; fall back to offline tokens with later sync; capture device meta + photo (optional) for fraud deterrence. |
| Location Control | Maintain per-entity geofences & IP allowlists; mobile punches must fall within assigned geofence or approved remote flag; office web punches must match whitelisted IP blocks. |
| Leave Types | Hard-code Taiwanese statutory leaves with configurable quotas + carry-over; allow admin-created custom leaves. Each leave type defines: accrual rule, documentation requirements, minimum notice, whether it deducts salary. |
| Documentation | Store uploaded files (sick note, marriage certificate, travel proof) with metadata + checksum. Enforce required attachments before submission. |
| Admin Visibility | Dashboards for HR/accounting to view daily status, missing punches, overtime, anomalies (GPS mismatch, duplicate IP, too-short shifts), and leave pipeline. |
| Notifications | Integrate with existing `NotificationModule` to alert employees/managers for missing punches, approvals, expiring documents, balance low, etc. |
| Auditability | Mirror every action into `AuditLog`; keep immutable history of punches and leave decisions. |
| Integration | Payroll consumes approved leave/absence + overtime; Approvals handles multi-step leave sign-off; Reporting exposes attendance KPIs. |

## 3. Data Model Additions (Prisma)
```prisma
enum AttendanceMethod {
  MOBILE
  WEB
  KIOSK
}

enum AttendanceEventType {
  CLOCK_IN
  CLOCK_OUT
  BREAK_START
  BREAK_END
}

enum LeaveStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  REJECTED
  CANCELLED
}

model AttendancePolicy {
  id             String   @id @default(uuid())
  entityId       String   @map("entity_id")
  name           String
  type           String   @default("office") // office, remote, hybrid
  ipAllowList    Json?    @map("ip_allow_list") // CIDR blocks
  geofence       Json?    // polygons or circle definitions
  requiresPhoto  Boolean  @default(false) @map("requires_photo")
  maxEarlyClock  Int      @default(15) @map("max_early_clock") // minutes before shift
  maxLateClock   Int      @default(5)  @map("max_late_clock")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  entity    Entity               @relation(fields: [entityId], references: [id], onDelete: Cascade)
  schedules AttendanceSchedule[]
}

model AttendanceSchedule {
  id             String   @id @default(uuid())
  policyId       String   @map("policy_id")
  departmentId   String?  @map("department_id")
  employeeId     String?  @map("employee_id")
  weekday        Int      // 0=Sun ... 6=Sat
  shiftStart     String   @map("shift_start") // HH:mm, store as text for TZ simplicity
  shiftEnd       String   @map("shift_end")
  breakMinutes   Int      @default(60) @map("break_minutes")
  allowRemote    Boolean  @default(false) @map("allow_remote")
  createdAt      DateTime @default(now()) @map("created_at")

  policy     AttendancePolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  department Department?       @relation(fields: [departmentId], references: [id])
  employee   Employee?         @relation(fields: [employeeId], references: [id])

  @@index([departmentId])
  @@index([employeeId])
}

model AttendanceRecord {
  id              String              @id @default(uuid())
  entityId        String              @map("entity_id")
  employeeId      String              @map("employee_id")
  scheduleId      String?             @map("schedule_id")
  eventType       AttendanceEventType @map("event_type")
  method          AttendanceMethod
  timestamp       DateTime
  latitude        Decimal? @db.Decimal(10, 6)
  longitude       Decimal? @db.Decimal(10, 6)
  ipAddress       String?  @map("ip_address")
  deviceInfo      Json?     @map("device_info")
  photoUrl        String?   @map("photo_url")
  isWithinFence   Boolean   @default(true) @map("is_within_fence")
  isWithinIpRange Boolean   @default(true) @map("is_within_ip_range")
  anomalyFlag     Boolean   @default(false) @map("anomaly_flag")
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")

  entity   Entity        @relation(fields: [entityId], references: [id], onDelete: Cascade)
  employee Employee      @relation(fields: [employeeId], references: [id])
  schedule AttendanceSchedule? @relation(fields: [scheduleId], references: [id])

  @@index([entityId, employeeId, timestamp])
  @@index([anomalyFlag])
}

model AttendanceDailySummary {
  id             String   @id @default(uuid())
  entityId       String   @map("entity_id")
  employeeId     String   @map("employee_id")
  workDate       DateTime @map("work_date")
  clockInTime    DateTime? @map("clock_in_time")
  clockOutTime   DateTime? @map("clock_out_time")
  breakMinutes   Int       @default(0) @map("break_minutes")
  workedMinutes  Int       @default(0) @map("worked_minutes")
  overtimeMinutes Int      @default(0) @map("overtime_minutes")
  status         String    @default("pending") // pending, completed, missing_clock
  anomalyReason  String?
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  entity   Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  employee Employee @relation(fields: [employeeId], references: [id])

  @@unique([entityId, employeeId, workDate])
}

model LeaveType {
  id                 String   @id @default(uuid())
  entityId           String   @map("entity_id")
  code               String   // SICK, PERSONAL, ANNUAL, MENSTRUAL, MARRIAGE, FUNERAL, MATERNITY, PATERNITY, COMP_TIME, CUSTOM
  name               String
  requiresDocument   Boolean  @default(false) @map("requires_document")
  documentExamples   String?  @map("document_examples")
  maxDaysPerYear     Decimal? @map("max_days_per_year") @db.Decimal(5, 2)
  minNoticeHours     Int?     @map("min_notice_hours")
  paidPercentage     Decimal? @map("paid_percentage") @db.Decimal(5, 2)
  autoApprovalHours  Int?     @map("auto_approval_hours")
  approvalPolicyId   String?  @map("approval_policy_id")
  requiresChildData  Boolean  @default(false) @map("requires_child_data") // for maternity/paternity
  metadata           Json?
  isActive           Boolean  @default(true) @map("is_active")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  entity        Entity         @relation(fields: [entityId], references: [id], onDelete: Cascade)
  approvalPolicy ApprovalPolicy? @relation(fields: [approvalPolicyId], references: [id], onDelete: SetNull)
  leaveRequests  LeaveRequest[]

  @@unique([entityId, code])
}

model LeaveBalance {
  id             String   @id @default(uuid())
  entityId       String   @map("entity_id")
  employeeId     String   @map("employee_id")
  leaveTypeId    String   @map("leave_type_id")
  year           Int
  accruedHours   Decimal @default(0) @map("accrued_hours") @db.Decimal(6, 2)
  usedHours      Decimal @default(0) @map("used_hours") @db.Decimal(6, 2)
  carryOverHours Decimal @default(0) @map("carry_over_hours") @db.Decimal(6, 2)
  pendingHours   Decimal @default(0) @map("pending_hours") @db.Decimal(6, 2)
  updatedAt      DateTime @updatedAt @map("updated_at")

  entity     Entity     @relation(fields: [entityId], references: [id], onDelete: Cascade)
  employee   Employee   @relation(fields: [employeeId], references: [id])
  leaveType  LeaveType  @relation(fields: [leaveTypeId], references: [id])

  @@unique([entityId, employeeId, leaveTypeId, year])
}

model LeaveRequest {
  id               String     @id @default(uuid())
  entityId         String     @map("entity_id")
  employeeId       String     @map("employee_id")
  leaveTypeId      String     @map("leave_type_id")
  startAt          DateTime   @map("start_at")
  endAt            DateTime   @map("end_at")
  hours            Decimal    @db.Decimal(5, 2)
  status           LeaveStatus @default(DRAFT)
  reviewerId       String?    @map("reviewer_id")
  reason           String?
  location         String?    // domestic, overseas, remote city
  requiredDocsMet  Boolean    @default(false) @map("required_docs_met")
  metadata         Json?
  createdAt        DateTime   @default(now()) @map("created_at")
  updatedAt        DateTime   @updatedAt @map("updated_at")

  entity     Entity     @relation(fields: [entityId], references: [id], onDelete: Cascade)
  employee   Employee   @relation(fields: [employeeId], references: [id])
  leaveType  LeaveType  @relation(fields: [leaveTypeId], references: [id])
  reviewer   User?      @relation(fields: [reviewerId], references: [id])
  documents  LeaveDocument[]
  histories  LeaveRequestHistory[]

  @@index([entityId, status])
  @@index([employeeId])
}

model LeaveDocument {
  id            String   @id @default(uuid())
  leaveRequestId String  @map("leave_request_id")
  fileName      String   @map("file_name")
  fileUrl       String   @map("file_url")
  mimeType      String   @map("mime_type")
  checksum      String?
  docType       String?  // medical_note, travel_itinerary, certificate
  uploadedBy    String   @map("uploaded_by")
  uploadedAt    DateTime @default(now()) @map("uploaded_at")

  leaveRequest LeaveRequest @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)
  uploader     User         @relation(fields: [uploadedBy], references: [id])
}

model LeaveRequestHistory {
  id             String   @id @default(uuid())
  leaveRequestId String   @map("leave_request_id")
  action         String
  fromStatus     LeaveStatus?
  toStatus       LeaveStatus?
  actorId        String?  @map("actor_id")
  note           String?
  metadata       Json?
  createdAt      DateTime @default(now()) @map("created_at")

  leaveRequest LeaveRequest @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)
  actor        User?        @relation(fields: [actorId], references: [id])
}

model AttendanceAnomaly {
  id             String   @id @default(uuid())
  entityId       String   @map("entity_id")
  employeeId     String   @map("employee_id")
  summaryId      String?  @map("summary_id")
  recordId       String?  @map("record_id")
  type           String   // missing_clock, gps_mismatch, duplicate_ip, overtime_without_request
  severity       String   @default("medium")
  detectedAt     DateTime @default(now()) @map("detected_at")
  resolvedStatus String   @default("open") @map("resolved_status")
  resolverId     String?  @map("resolver_id")
  resolutionNote String?  @map("resolution_note")

  entity   Entity                 @relation(fields: [entityId], references: [id], onDelete: Cascade)
  employee Employee               @relation(fields: [employeeId], references: [id])
  summary  AttendanceDailySummary? @relation(fields: [summaryId], references: [id])
  record   AttendanceRecord?       @relation(fields: [recordId], references: [id])
  resolver User?                   @relation(fields: [resolverId], references: [id])

  @@index([entityId, resolvedStatus])
}
```

**Notes**
- Existing `Employee` model gains `userId` (nullable) to bind attendance actions to login identity.
- Large file storage should reuse whichever object storage service the project already employs (S3/GCS); Prisma stores signed URL + checksum only.
- All new tables include `entityId` for multi-tenant scoping.

## 4. Backend Architecture (NestJS)
### 4.1 Module Layout
```
modules/
  attendance/
    attendance.module.ts
    controllers/
      attendance.controller.ts        // employee-facing APIs
      attendance-admin.controller.ts  // HR/admin dashboards
      leave.controller.ts             // leave submission
      leave-admin.controller.ts       // approvals + policies
    services/
      attendance.service.ts
      schedule.service.ts
      leave.service.ts
      policy.service.ts
      anomaly.service.ts
      balance.service.ts
    strategies/
      gps-validation.strategy.ts
      ip-validation.strategy.ts
    subscribers/
      notification.subscriber.ts
      approvals.subscriber.ts
```
- `AttendanceService` orchestrates punch validation, persists `AttendanceRecord`, and updates `AttendanceDailySummary`.
- `ScheduleService` resolves applicable schedule/policy per employee/day.
- `LeaveService` handles requests, documents, history, and webhooks to `ApprovalsModule` when multi-step review is needed.
- `AnomalyService` runs cron jobs (e.g., every 15 minutes + nightly) to detect missing punches, mismatched GPS/IP, overtime, duplicate devices, and writes `AttendanceAnomaly` + notifications.
- `BalanceService` accrues leave hours (monthly job) and validates balances before approvals.

### 4.2 Clock-in Validation Flow
1. Employee hits `POST /attendance/clock-in` with GPS, IP, device info, optional photo.
2. Controller detects entity + user via JWT, fetches `Employee` link.
3. `ScheduleService` resolves applicable `AttendanceSchedule`; `PolicyService` loads geofence/IP rules.
4. `GpsValidationStrategy` checks `latitude/longitude` within polygon; `IpValidationStrategy` matches CIDR list. Both return boolean + reason codes.
5. If validations fail, mark `anomalyFlag = true`, auto-create `AttendanceAnomaly` (type `gps_mismatch` / `ip_violation`), optionally block punch unless policy `allowRemote`.
6. Persist `AttendanceRecord`; update `AttendanceDailySummary.clockInTime`. Mirror event to `AuditLog` + `NotificationModule` ("Clock-in outside geofence").
7. Trigger websocket/event to frontend (optional) so dashboards update in near real-time.

### 4.3 Clock-out & Breaks
- Similar flow using `eventType` to compute `workedMinutes` and generate overtime. `ScheduleService` calculates expected hours (shift length - break) to categorize `AttendanceDailySummary.status`.
- Break punches update `breakMinutes`; system enforces maximum allowed break lengths from policy.

### 4.4 Leave Workflow
1. Employee calls `POST /attendance/leaves` with leave type, time span, reason, attachments metadata.
2. `LeaveService` verifies:
   - Balance >= requested hours (except unpaid leaves).
   - Minimum notice satisfied (unless marking as retroactive with reason & admin override).
   - Required documents uploaded (based on `LeaveType.requiresDocument`).
3. If leave type references `approvalPolicyId`, create `ApprovalRequest` records via `ApprovalsModule`; statuses tracked through `LeaveRequestHistory`.
4. Once approved:
   - Deduct `LeaveBalance.usedHours`, drop `pendingHours`.
   - Write to `Payroll` integration table (or reuse existing payroll adjustments) for the pay period.
   - Notify employee + manager.
5. Rejections or cancellations revert `pendingHours` and notify via `NotificationModule`.

### 4.5 Notifications & Audit
- Every controller emits domain events (`AttendanceEvent`, `LeaveEvent`). Consumers send notifications, log audit entries, and push to analytics pipelines.
- Use existing `NotificationService` to fan out to in-app + email/push (if available). Example events: `MISSING_CLOCK`, `LEAVE_APPROVED`, `ANOMALY_DETECTED`.

### 4.6 Schedulers & Integrations
- Nightly job: finalize `AttendanceDailySummary` for previous day, auto-generate anomalies for missing clock-outs, push summary to Payroll.
- Monthly job: accrue leave balances (annual leave accrual, carry-over logic, menstrual leave 1 day per month, etc.).
- API-to-Payroll: add method `payrollService.syncAttendanceSummaries(entityId, startDate, endDate)` returning aggregated hours and approved leaves.

## 5. Frontend Architecture (Vite + Ant Design)
### 5.1 Routes & Pages
- `pages/attendance/EmployeeDashboard.tsx`
  - Shows today's schedule, punch buttons (clock-in/out/break), last punch data, GPS/IP status, leave balance snapshots.
  - Uses device geolocation API + network info; blocks action when validations fail, guiding user to fix location/IP.
- `pages/attendance/AdminOverview.tsx`
  - Calendar heatmap + table of employees with status (on time, late, missing clock, remote).
  - Widgets for anomalies, overtime approvals, upcoming leaves.
- `pages/attendance/AnomalyCenter.tsx`
  - Filters by type/severity, allow HR to resolve and add notes.
- `pages/attendance/LeaveRequestPage.tsx`
  - Multi-step form: select leave type (auto-populate doc requirements), choose date/time, upload proofs, preview balance.
- `pages/attendance/LeaveApprovalPage.tsx`
  - Managers review leave requests, view attachments inline, approve/return with comments.

### 5.2 State & Services
- New `AttendanceContext` caches realtime status (last punch, current summary) and websockets for live updates.
- API client in `services/attendance.ts` exposing endpoints described below.
- File uploads reuse existing uploader util (if any) or integrate with backend pre-signed URLs.
- Notification center already exists; feed attendance events there.

### 5.3 UX Considerations
- Display GPS + IP validation indicators before punching (green/red chips).
- Provide offline mode: queue punches locally with encrypted payload; sync when connection returns (optional advanced step).
- Responsive design: employee dashboard optimized for mobile; admin boards use responsive tables/cards.
- Localization: reuse i18n utilities; ensure leave types show Taiwanese legal descriptions.

## 6. API Surface (initial draft)
| Method | Path | Description |
| --- | --- | --- |
| POST | `/attendance/clock-in` | Create `CLOCK_IN` record; body includes `timestamp`, `lat`, `lng`, `ip`, `method`, `photoUploadId`. |
| POST | `/attendance/clock-out` | End-of-day punch; updates summary & overtime. |
| POST | `/attendance/breaks/start` / `/breaks/end` | Optional break tracking. |
| GET | `/attendance/records` | Paginated history for employee (or admin with filters). |
| GET | `/attendance/daily-summary` | Returns computed status for date range. |
| GET | `/attendance/admin/dashboard` | Aggregated KPIs, top anomalies. |
| POST | `/attendance/policies` | CRUD for policies + schedules. |
| POST | `/attendance/leaves` | Submit leave request w/ attachments metadata. |
| GET | `/attendance/leaves` | List leave requests with filters (status, type, employee). |
| PATCH | `/attendance/leaves/:id/approve` | Managers/HR to approve/reject/cancel. |
| GET | `/attendance/leave-types` | Catalog of configured leave types + document rules. |
| GET | `/attendance/leave-balances` | Summary per employee and leave type. |

All endpoints guard with JWT + permission checks (`ATTENDANCE_SELF`, `ATTENDANCE_ADMIN`, `LEAVE_APPROVER`).

## 7. Security & Compliance
- IP allowlist stored as CIDR; `IpValidationStrategy` uses `ipaddr.js` (Node) to evaluate.
- Geofence stored as GeoJSON; validations performed on backend to avoid tampering.
- Sensitive metadata (GPS, device) encrypted at rest if database encryption is enabled; limit retention per privacy rules (e.g., purge > 2 years).
- File uploads scanned for malware; limit accepted MIME types.
- Attach `AuditLog` entries for every create/update; include IP + user agent.

## 8. Analytics & Reporting
- Add attendance metrics to Reporting module: punctuality rate, leave usage by type, overtime trends, anomaly closure SLAs.
- Attendance summaries expose BI-friendly table (`AttendanceDailySummary`) that can be queried by date/entity/department.

## 9. Delivery Plan
1. **Schema Migration & Seeders**: add enums + models; seed default leave types for TW (including statutory quotas + doc rules).
2. **Backend Foundations**: create module, services, validators, and base endpoints for punches + leave submission.
3. **Frontend MVP**: employee dashboard & leave request form with balancing; admin overview table.
4. **Compliance Enhancements**: GPS/IP enforcement toggles, document enforcement, anomaly jobs.
5. **Integrations**: payroll sync, notification fan-out, reports widgets.
6. **QA**: E2E tests covering typical and edge cases (remote punches, missing docs, multi-level approvals).

## 10. Open Questions
- Do we need hardware (kiosk) integrations? Current design assumes software-based kiosk using tablets ± QR codes.
- What file storage/backends are approved for PII & medical documents? Need confirmation to finalize storage adapter.
- Should overtime require pre-approval or auto-approval thresholds per policy? Could extend `AttendancePolicy` later.
- Any unions or entity-specific leave formulas beyond Taiwanese statutory defaults?

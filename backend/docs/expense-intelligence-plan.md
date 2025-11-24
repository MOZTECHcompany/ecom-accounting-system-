# Expense Account Intelligence Plan

## Goals
- Suggest the most likely GL account for every expense request automatically.
- Capture reviewer overrides to continuously improve future suggestions.
- Keep the experience consistent for employees, approvers, and finance.

## Data Model Changes (Prisma)
1. **ExpenseRequest**
   - `suggestedAccountId` (nullable, FK -> Account)
   - `finalAccountId` (nullable, FK -> Account) – set when finance confirms/overrides.
   - `suggestionConfidence` (Decimal 5,2) – quick indicator for reviewers.
2. **ReimbursementItem**
   - `defaultAccountId` (FK -> Account, existing `accountId` column already serves this, reuse but expose in services).
   - `keywords` (String?) – comma-separated hints for classifier bootstrap.
3. **ExpenseRequestHistory** (new table)
   - captures every status change, suggested account, final account, actor, and notes.
4. **AccountingClassifierFeedback** (new table)
   - `requestId`, `suggestedAccountId`, `chosenAccountId`, `confidence`, `label` (correct/incorrect), `features` (JSON), `createdBy`.
5. **PaymentTask** (future) – store link to ExpenseRequest and the GL posting result.

## Backend Services
1. **Classifier Service (`accounting-classifier.service.ts`)**
   - Input: entityId, description, reimbursementItemId, amount, attachments metadata.
   - Pipeline: deterministic mapping -> keyword rules -> optional ML model.
   - Output: `{ accountId, confidence, source }`.
   - Save evaluation + features for later training.
2. **Approval Service Enhancements**
   - On submit: call classifier, store suggestion on `ExpenseRequest`.
   - On approve/reject: append `ExpenseRequestHistory` entry and update `AccountingClassifierFeedback`.
   - On approve success: emit event for PaymentTask generator + journal entry workflow.
3. **PaymentTask Service** (stub)
   - Listens to approved expense events, creates tasks with `finalAccountId || suggestedAccountId`.

## API Changes
- `POST /expense/requests`
  - Returns suggested account + confidence.
- `GET /expense/requests/:id/history`
  - Exposes timeline including suggestions/decisions.
- `POST /expense/requests/:id/approve`
  - Accept optional `finalAccountId` + remark.
- `POST /expense/requests/:id/feedback`
  - Allows finance to mark suggestion as incorrect (used for immediate learning updates).
- `GET /reimbursement-items`
  - Include `defaultAccount` metadata + keywords for UI hints.

## Frontend Updates
1. **Employee experience**
   - Drawer form: show suggested account preview (read-only) after filling description / selecting item.
2. **Approver experience**
   - “Pending approvals” list: display suggested account chips with confidence color.
   - Detail panel: allow override via Account dropdown + remarks.
3. **Finance console**
   - Batch approve/assign accounts, show funnel of suggestion accuracy.
   - Action buttons to mark suggestion correct/incorrect.
4. **Notification Center**
   - New messages referencing suggested account for quick triage.

## Learning Loop
1. Store every suggestion + final choice in `AccountingClassifierFeedback`.
2. Nightly (or hourly) job exports feedback rows, trains lightweight model (e.g., TF-IDF + logistic regression via Python script in `tools/classifier-trainer.py`).
3. The job writes serialized weights to `classifier-model.json`. Backend loads the file at startup or via hot reload endpoint.
4. Confidence thresholds:
   - `>=0.8`: mark as "High" (green).
   - `0.5 - 0.8`: "Medium" (amber) – request manual review.
   - `<0.5`: "Low" (red) – highlight for finance.

## Phased Delivery
1. **Phase 1 – Schema + APIs**
   - Prisma migration for new columns/tables.
   - Implement deterministic classifier, suggestion storage, history recording.
2. **Phase 2 – Frontend wiring**
   - Surface suggestions + overrides in React pages.
3. **Phase 3 – Feedback + Analytics**
   - Implement feedback endpoint, dashboard metrics, Notification integration.
4. **Phase 4 – ML Model**
   - Add trainer script + scheduled job, integrate predictions with existing service.

## Next Steps
- [ ] Align on Prisma schema additions.
- [ ] Implement migration + repository helpers.
- [ ] Build `AccountingClassifierService` with rule engine + telemetry.
- [ ] Update expense controller/service to call classifier and write history.
- [ ] Extend frontend forms & lists.

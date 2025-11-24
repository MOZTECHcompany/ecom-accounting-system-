-- AlterTable
ALTER TABLE "expense_requests" ADD COLUMN     "evidence_files" JSONB,
ADD COLUMN     "final_account_id" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "receipt_type" TEXT,
ADD COLUMN     "reimbursement_item_id" TEXT,
ADD COLUMN     "suggested_account_id" TEXT,
ADD COLUMN     "suggestion_confidence" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reimbursement_items" ADD COLUMN     "amount_limit" DECIMAL(18,2),
ADD COLUMN     "approval_policy_id" TEXT,
ADD COLUMN     "approver_role_codes" TEXT,
ADD COLUMN     "default_receipt_type" TEXT,
ADD COLUMN     "keywords" TEXT,
ADD COLUMN     "requires_department_head" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "approval_policies" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "policy_type" TEXT NOT NULL DEFAULT 'amount_threshold',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_policy_steps" (
    "id" TEXT NOT NULL,
    "approval_policy_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "min_amount" DECIMAL(18,2),
    "max_amount" DECIMAL(18,2),
    "approver_role_code" TEXT,
    "requires_department_head" BOOLEAN NOT NULL DEFAULT false,
    "fallback_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_policy_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "expense_request_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approver_role_code" TEXT,
    "approver_user_id" TEXT,
    "department_id" TEXT,
    "amount_threshold" DECIMAL(18,2),
    "assigned_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_request_histories" (
    "id" TEXT NOT NULL,
    "expense_request_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "actor_id" TEXT,
    "actor_role_code" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "attachments" JSONB,
    "suggested_account_id" TEXT,
    "final_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_request_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_tasks" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "expense_request_id" TEXT,
    "account_id" TEXT,
    "vendor_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduled_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "paid_date" TIMESTAMP(3),
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_classifier_feedbacks" (
    "id" TEXT NOT NULL,
    "expense_request_id" TEXT NOT NULL,
    "suggested_account_id" TEXT,
    "chosen_account_id" TEXT,
    "confidence" DECIMAL(5,2),
    "label" TEXT,
    "features" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_classifier_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_policies_entity_id_is_active_idx" ON "approval_policies"("entity_id", "is_active");

-- CreateIndex
CREATE INDEX "approval_policy_steps_approval_policy_id_idx" ON "approval_policy_steps"("approval_policy_id");

-- CreateIndex
CREATE INDEX "approval_steps_expense_request_id_step_order_idx" ON "approval_steps"("expense_request_id", "step_order");

-- CreateIndex
CREATE INDEX "approval_steps_status_idx" ON "approval_steps"("status");

-- CreateIndex
CREATE INDEX "expense_request_histories_expense_request_id_idx" ON "expense_request_histories"("expense_request_id");

-- CreateIndex
CREATE INDEX "expense_request_histories_created_at_idx" ON "expense_request_histories"("created_at");

-- CreateIndex
CREATE INDEX "payment_tasks_entity_id_status_idx" ON "payment_tasks"("entity_id", "status");

-- CreateIndex
CREATE INDEX "accounting_classifier_feedbacks_expense_request_id_idx" ON "accounting_classifier_feedbacks"("expense_request_id");

-- CreateIndex
CREATE INDEX "expense_requests_reimbursement_item_id_idx" ON "expense_requests"("reimbursement_item_id");

-- CreateIndex
CREATE INDEX "expense_requests_suggested_account_id_idx" ON "expense_requests"("suggested_account_id");

-- CreateIndex
CREATE INDEX "expense_requests_final_account_id_idx" ON "expense_requests"("final_account_id");

-- CreateIndex
CREATE INDEX "reimbursement_items_approval_policy_id_idx" ON "reimbursement_items"("approval_policy_id");

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_reimbursement_item_id_fkey" FOREIGN KEY ("reimbursement_item_id") REFERENCES "reimbursement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_suggested_account_id_fkey" FOREIGN KEY ("suggested_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_final_account_id_fkey" FOREIGN KEY ("final_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_items" ADD CONSTRAINT "reimbursement_items_approval_policy_id_fkey" FOREIGN KEY ("approval_policy_id") REFERENCES "approval_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy_steps" ADD CONSTRAINT "approval_policy_steps_approval_policy_id_fkey" FOREIGN KEY ("approval_policy_id") REFERENCES "approval_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policy_steps" ADD CONSTRAINT "approval_policy_steps_fallback_user_id_fkey" FOREIGN KEY ("fallback_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_expense_request_id_fkey" FOREIGN KEY ("expense_request_id") REFERENCES "expense_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_request_histories" ADD CONSTRAINT "expense_request_histories_expense_request_id_fkey" FOREIGN KEY ("expense_request_id") REFERENCES "expense_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_request_histories" ADD CONSTRAINT "expense_request_histories_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_request_histories" ADD CONSTRAINT "expense_request_histories_suggested_account_id_fkey" FOREIGN KEY ("suggested_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_request_histories" ADD CONSTRAINT "expense_request_histories_final_account_id_fkey" FOREIGN KEY ("final_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_tasks" ADD CONSTRAINT "payment_tasks_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_tasks" ADD CONSTRAINT "payment_tasks_expense_request_id_fkey" FOREIGN KEY ("expense_request_id") REFERENCES "expense_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_tasks" ADD CONSTRAINT "payment_tasks_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_tasks" ADD CONSTRAINT "payment_tasks_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_expense_request_id_fkey" FOREIGN KEY ("expense_request_id") REFERENCES "expense_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_suggested_account_id_fkey" FOREIGN KEY ("suggested_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_chosen_account_id_fkey" FOREIGN KEY ("chosen_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


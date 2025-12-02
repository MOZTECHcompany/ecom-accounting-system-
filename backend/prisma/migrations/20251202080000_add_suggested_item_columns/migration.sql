-- AlterTable
ALTER TABLE "expense_requests" ADD COLUMN "suggested_item_id" TEXT;

-- CreateIndex
CREATE INDEX "expense_requests_suggested_item_id_idx" ON "expense_requests"("suggested_item_id");

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_suggested_item_id_fkey" FOREIGN KEY ("suggested_item_id") REFERENCES "reimbursement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "accounting_classifier_feedbacks" ADD COLUMN "suggested_item_id" TEXT;
ALTER TABLE "accounting_classifier_feedbacks" ADD COLUMN "chosen_item_id" TEXT;

-- AddForeignKey
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_suggested_item_id_fkey" FOREIGN KEY ("suggested_item_id") REFERENCES "reimbursement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_chosen_item_id_fkey" FOREIGN KEY ("chosen_item_id") REFERENCES "reimbursement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

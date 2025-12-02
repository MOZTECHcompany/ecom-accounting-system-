/*
  Warnings:

  - Added the required column `entity_id` to the `accounting_classifier_feedbacks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "accounting_classifier_feedbacks" DROP CONSTRAINT "accounting_classifier_feedbacks_expense_request_id_fkey";

-- AlterTable
ALTER TABLE "accounting_classifier_feedbacks" ADD COLUMN     "description" TEXT,
ADD COLUMN     "entity_id" TEXT,
ALTER COLUMN "expense_request_id" DROP NOT NULL;

-- Backfill existing rows using the related expense request entity
UPDATE "accounting_classifier_feedbacks" acf
SET "entity_id" = er."entity_id"
FROM "expense_requests" er
WHERE acf."entity_id" IS NULL
  AND acf."expense_request_id" = er."id";

-- Enforce NOT NULL after data has been populated
ALTER TABLE "accounting_classifier_feedbacks"
ALTER COLUMN "entity_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "accounting_classifier_feedbacks_entity_id_idx" ON "accounting_classifier_feedbacks"("entity_id");

-- AddForeignKey
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_classifier_feedbacks" ADD CONSTRAINT "accounting_classifier_feedbacks_expense_request_id_fkey" FOREIGN KEY ("expense_request_id") REFERENCES "expense_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

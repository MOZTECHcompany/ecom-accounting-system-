-- Add recurring payment support to ap_invoices
ALTER TABLE "ap_invoices"
  ADD COLUMN "next_due_date" TIMESTAMP,
  ADD COLUMN "payment_frequency" TEXT NOT NULL DEFAULT 'one_time',
  ADD COLUMN "is_recurring_monthly" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "recurring_day_of_month" INTEGER;

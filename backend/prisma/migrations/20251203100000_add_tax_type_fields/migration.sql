-- Add TaxType enum and tax columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxType') THEN
    CREATE TYPE "TaxType" AS ENUM (
      'TAXABLE_5_PERCENT',
      'NON_DEDUCTIBLE_5_PERCENT',
      'ZERO_RATED',
      'TAX_FREE'
    );
  END IF;
END $$;

ALTER TABLE "reimbursement_items"
  ADD COLUMN IF NOT EXISTS "default_tax_type" "TaxType" NOT NULL DEFAULT 'TAXABLE_5_PERCENT';

ALTER TABLE "expense_requests"
  ADD COLUMN IF NOT EXISTS "tax_type" "TaxType" NOT NULL DEFAULT 'TAXABLE_5_PERCENT',
  ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(18, 2);

ALTER TABLE "ap_invoices"
  ADD COLUMN IF NOT EXISTS "tax_type" "TaxType" NOT NULL DEFAULT 'TAXABLE_5_PERCENT',
  ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(18, 2);

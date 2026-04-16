CREATE TABLE "payroll_policies" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "standard_monthly_hours" DECIMAL(18,2) NOT NULL DEFAULT 240,
    "overtime_multiplier" DECIMAL(10,4) NOT NULL DEFAULT 1.33,
    "tw_labor_insurance_rate" DECIMAL(10,6) NOT NULL DEFAULT 0.022,
    "tw_health_insurance_rate" DECIMAL(10,6) NOT NULL DEFAULT 0.015,
    "cn_social_insurance_rate" DECIMAL(10,6) NOT NULL DEFAULT 0.105,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_policies_entity_id_key" ON "payroll_policies"("entity_id");

ALTER TABLE "payroll_policies"
ADD CONSTRAINT "payroll_policies_entity_id_fkey"
FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add role code and hierarchy level columns
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "code" TEXT;

UPDATE "roles" SET "code" = "name" WHERE "code" IS NULL;

ALTER TABLE "roles"
  ALTER COLUMN "code" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'roles_code_key'
  ) THEN
    CREATE UNIQUE INDEX "roles_code_key" ON "roles" ("code");
  END IF;
END;
$$;

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "hierarchy_level" INTEGER NOT NULL DEFAULT 3;

UPDATE "roles"
SET "hierarchy_level" = CASE
  WHEN "name" = 'SUPER_ADMIN' THEN 1
  WHEN "name" = 'ADMIN' THEN 2
  WHEN "name" = 'ACCOUNTANT' THEN 3
  WHEN "name" = 'OPERATOR' THEN 4
  ELSE "hierarchy_level"
END;

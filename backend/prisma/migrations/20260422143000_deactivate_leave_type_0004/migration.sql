UPDATE "leave_types"
SET "is_active" = false,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = '0004'
  AND "is_active" = true;

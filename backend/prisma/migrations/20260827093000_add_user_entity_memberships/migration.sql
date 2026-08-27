CREATE TABLE "user_entity_memberships" (
    "user_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_entity_memberships_pkey" PRIMARY KEY ("user_id", "entity_id")
);

CREATE INDEX "user_entity_memberships_entity_id_idx"
    ON "user_entity_memberships"("entity_id");

CREATE UNIQUE INDEX "user_entity_memberships_one_primary_per_user_idx"
    ON "user_entity_memberships"("user_id")
    WHERE "is_primary" = true;

ALTER TABLE "user_entity_memberships"
    ADD CONSTRAINT "user_entity_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_entity_memberships"
    ADD CONSTRAINT "user_entity_memberships_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Verified production mapping: Lemon operates both Taiwan and China entities.
INSERT INTO "user_entity_memberships" ("user_id", "entity_id", "is_primary")
SELECT "users"."id", "entities"."id", "entities"."id" = 'tw-entity-001'
FROM "users"
JOIN "entities" ON "entities"."id" IN ('tw-entity-001', 'cn-entity-001')
WHERE LOWER("users"."email") = 'mozlemon@moztech.cc'
ON CONFLICT ("user_id", "entity_id") DO UPDATE
SET "is_primary" = EXCLUDED."is_primary";

UPDATE "users"
SET
    "accounting_data_scope" = 'ENTITY',
    "inventory_data_scope" = 'ENTITY',
    "sales_data_scope" = 'ENTITY',
    "purchasing_data_scope" = 'ENTITY',
    "banking_data_scope" = 'ENTITY',
    "updated_at" = CURRENT_TIMESTAMP
WHERE LOWER("email") = 'mozlemon@moztech.cc';

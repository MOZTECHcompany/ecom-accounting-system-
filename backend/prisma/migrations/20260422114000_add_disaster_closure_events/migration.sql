CREATE TABLE "disaster_closure_events" (
  "id" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "closure_date" TIMESTAMP(3) NOT NULL,
  "scope_type" TEXT NOT NULL DEFAULT 'ENTITY',
  "scope_ids" JSONB,
  "pay_policy" TEXT NOT NULL DEFAULT 'NO_DEDUCTION',
  "paid_percentage" DECIMAL(5,2),
  "source" TEXT,
  "announcement_region" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "disaster_closure_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disaster_closure_events_entity_id_closure_date_idx"
  ON "disaster_closure_events"("entity_id", "closure_date");

CREATE INDEX "disaster_closure_events_entity_id_is_active_idx"
  ON "disaster_closure_events"("entity_id", "is_active");

ALTER TABLE "disaster_closure_events"
  ADD CONSTRAINT "disaster_closure_events_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disaster_closure_events"
  ADD CONSTRAINT "disaster_closure_events_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

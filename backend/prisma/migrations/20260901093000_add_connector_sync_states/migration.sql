CREATE TABLE "connector_sync_states" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'never',
    "trigger" TEXT,
    "lock_token" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "window_start" TIMESTAMP(3),
    "window_end" TIMESTAMP(3),
    "last_started_at" TIMESTAMP(3),
    "last_finished_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "last_error" TEXT,
    "last_metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_sync_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "connector_sync_states_entity_connector_key"
    ON "connector_sync_states"("entity_id", "connector");

CREATE INDEX "connector_sync_states_entity_id_status_idx"
    ON "connector_sync_states"("entity_id", "status");

CREATE INDEX "connector_sync_states_connector_last_success_at_idx"
    ON "connector_sync_states"("connector", "last_success_at");

ALTER TABLE "connector_sync_states"
    ADD CONSTRAINT "connector_sync_states_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "entities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

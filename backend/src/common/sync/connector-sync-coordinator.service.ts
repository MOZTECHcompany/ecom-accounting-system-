import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type ConnectorSyncLease = {
  entityId: string;
  connector: string;
  lockToken: string;
};

export type ConnectorSyncAcquireResult =
  | { acquired: true; lease: ConnectorSyncLease }
  | {
      acquired: false;
      runningSince: Date | null;
      leaseExpiresAt: Date | null;
    };

@Injectable()
export class ConnectorSyncCoordinatorService {
  constructor(private readonly prisma: PrismaService) {}

  async acquire(params: {
    entityId: string;
    connector: string;
    trigger: string;
    windowStart?: Date;
    windowEnd?: Date;
    leaseMinutes?: number;
  }): Promise<ConnectorSyncAcquireResult> {
    const connector = params.connector.trim().toLowerCase();
    const lockToken = randomUUID();
    const now = new Date();
    const leaseMinutes = Math.max(5, Math.min(params.leaseMinutes || 30, 120));
    const leaseExpiresAt = new Date(now.getTime() + leaseMinutes * 60 * 1000);

    const acquired = await this.prisma.$queryRaw<
      Array<{ lockToken: string }>
    >(Prisma.sql`
      INSERT INTO "connector_sync_states" (
        "id", "entity_id", "connector", "status", "trigger",
        "lock_token", "lease_expires_at", "window_start", "window_end",
        "last_started_at", "last_error", "last_metrics", "created_at", "updated_at"
      ) VALUES (
        ${randomUUID()}, ${params.entityId}, ${connector}, 'running', ${params.trigger},
        ${lockToken}, ${leaseExpiresAt}, ${params.windowStart || null}, ${params.windowEnd || null},
        ${now}, NULL, NULL, ${now}, ${now}
      )
      ON CONFLICT ("entity_id", "connector") DO UPDATE SET
        "status" = 'running',
        "trigger" = EXCLUDED."trigger",
        "lock_token" = EXCLUDED."lock_token",
        "lease_expires_at" = EXCLUDED."lease_expires_at",
        "window_start" = EXCLUDED."window_start",
        "window_end" = EXCLUDED."window_end",
        "last_started_at" = EXCLUDED."last_started_at",
        "last_error" = NULL,
        "last_metrics" = NULL,
        "updated_at" = EXCLUDED."updated_at"
      WHERE "connector_sync_states"."status" <> 'running'
         OR "connector_sync_states"."lease_expires_at" IS NULL
         OR "connector_sync_states"."lease_expires_at" <= ${now}
      RETURNING "lock_token" AS "lockToken"
    `);

    if (acquired[0]?.lockToken === lockToken) {
      return {
        acquired: true,
        lease: {
          entityId: params.entityId,
          connector,
          lockToken,
        },
      };
    }

    const existing = await this.prisma.connectorSyncState.findUnique({
      where: {
        entityId_connector: {
          entityId: params.entityId,
          connector,
        },
      },
      select: {
        lastStartedAt: true,
        leaseExpiresAt: true,
      },
    });

    return {
      acquired: false,
      runningSince: existing?.lastStartedAt || null,
      leaseExpiresAt: existing?.leaseExpiresAt || null,
    };
  }

  async markSuccess(
    lease: ConnectorSyncLease,
    metrics: Prisma.InputJsonValue,
  ) {
    const now = new Date();
    return this.prisma.connectorSyncState.updateMany({
      where: {
        entityId: lease.entityId,
        connector: lease.connector,
        lockToken: lease.lockToken,
      },
      data: {
        status: 'success',
        lockToken: null,
        leaseExpiresAt: null,
        lastFinishedAt: now,
        lastSuccessAt: now,
        lastError: null,
        lastMetrics: metrics,
      },
    });
  }

  async markFailure(lease: ConnectorSyncLease, error: unknown) {
    const now = new Date();
    const message =
      error instanceof Error ? error.message : String(error || 'Unknown error');
    return this.prisma.connectorSyncState.updateMany({
      where: {
        entityId: lease.entityId,
        connector: lease.connector,
        lockToken: lease.lockToken,
      },
      data: {
        status: 'failed',
        lockToken: null,
        leaseExpiresAt: null,
        lastFinishedAt: now,
        lastFailureAt: now,
        lastError: message.slice(0, 1000),
      },
    });
  }
}

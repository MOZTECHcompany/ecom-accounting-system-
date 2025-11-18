#!/bin/sh
# Migration script for invoicing and reconciliation tables
npx prisma migrate dev --name add_invoicing_and_reconciliation_tables --create-only

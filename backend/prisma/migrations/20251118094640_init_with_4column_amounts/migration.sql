-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tax_id" TEXT,
    "address" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "source_module" TEXT,
    "source_id" TEXT,
    "period_id" TEXT,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "memo" TEXT,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_channels" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "default_currency" TEXT NOT NULL DEFAULT 'TWD',
    "config_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "tax_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'individual',
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "default_currency" TEXT DEFAULT 'TWD',
    "tax_id" TEXT,
    "bank_info" JSONB,
    "contact_person" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "external_order_id" TEXT,
    "order_date" TIMESTAMP(3) NOT NULL,
    "total_gross_original" DECIMAL(18,2) NOT NULL,
    "total_gross_currency" TEXT NOT NULL DEFAULT 'TWD',
    "total_gross_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "total_gross_base" DECIMAL(18,2) NOT NULL,
    "tax_amount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "tax_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "tax_amount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_amount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "discount_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "discount_amount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "shipping_fee_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "shipping_fee_currency" TEXT NOT NULL DEFAULT 'TWD',
    "shipping_fee_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "shipping_fee_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "has_invoice" BOOLEAN NOT NULL DEFAULT false,
    "invoice_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty" DECIMAL(18,2) NOT NULL,
    "unit_price_original" DECIMAL(18,2) NOT NULL,
    "unit_price_currency" TEXT NOT NULL DEFAULT 'TWD',
    "unit_price_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "unit_price_base" DECIMAL(18,2) NOT NULL,
    "discount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "discount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "discount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "tax_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "tax_amount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "ship_date" TIMESTAMP(3) NOT NULL,
    "tracking_no" TEXT,
    "carrier" TEXT,
    "status" TEXT NOT NULL DEFAULT 'shipped',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "sales_order_id" TEXT,
    "channel_id" TEXT,
    "payout_batch_id" TEXT,
    "channel" TEXT NOT NULL,
    "payout_date" TIMESTAMP(3) NOT NULL,
    "amount_gross_original" DECIMAL(18,2) NOT NULL,
    "amount_gross_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_gross_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_gross_base" DECIMAL(18,2) NOT NULL,
    "fee_platform_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fee_platform_currency" TEXT NOT NULL DEFAULT 'TWD',
    "fee_platform_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "fee_platform_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fee_gateway_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fee_gateway_currency" TEXT NOT NULL DEFAULT 'TWD',
    "fee_gateway_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "fee_gateway_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "shipping_fee_paid_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "shipping_fee_paid_currency" TEXT NOT NULL DEFAULT 'TWD',
    "shipping_fee_paid_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "shipping_fee_paid_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount_net_original" DECIMAL(18,2) NOT NULL,
    "amount_net_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_net_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_net_base" DECIMAL(18,2) NOT NULL,
    "bank_account_id" TEXT,
    "reconciled_flag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_invoices" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "invoice_no" TEXT,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "paid_amount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "paid_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "paid_amount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "source_module" TEXT,
    "source_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ar_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ap_invoices" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "invoice_no" TEXT,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_amount_original" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "paid_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "paid_amount_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "source_module" TEXT,
    "source_id" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ap_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_requests" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "attachment_url" TEXT,
    "department_id" TEXT,
    "created_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approval_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "total_amount_original" DECIMAL(18,2) NOT NULL,
    "total_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "total_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "total_amount_base" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "source_module" TEXT,
    "source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "account_code" TEXT,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "description" TEXT,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" TEXT NOT NULL,
    "approver_id" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "total_amount_original" DECIMAL(18,2) NOT NULL,
    "total_amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "total_amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "total_amount_base" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty" DECIMAL(18,2) NOT NULL,
    "unit_cost_original" DECIMAL(18,2) NOT NULL,
    "unit_cost_currency" TEXT NOT NULL DEFAULT 'TWD',
    "unit_cost_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "unit_cost_base" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "batch_code" TEXT NOT NULL,
    "qty_received" DECIMAL(18,2) NOT NULL,
    "unit_cost_original" DECIMAL(18,6) NOT NULL,
    "unit_cost_currency" TEXT NOT NULL DEFAULT 'TWD',
    "unit_cost_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "unit_cost_base" DECIMAL(18,6) NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_costs" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "product_id" TEXT,
    "type" TEXT NOT NULL,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "allocation_qty" DECIMAL(18,2) NOT NULL,
    "allocated_per_unit" DECIMAL(18,6) NOT NULL,
    "allocated_qty_so_far" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch" TEXT,
    "account_no" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "is_virtual_support" BOOLEAN NOT NULL DEFAULT false,
    "meta_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_accounts" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "virtual_account_no" TEXT NOT NULL,
    "assigned_to_type" TEXT,
    "assigned_to_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "virtual_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "txn_date" TIMESTAMP(3) NOT NULL,
    "value_date" TIMESTAMP(3) NOT NULL,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "description_raw" TEXT NOT NULL,
    "reference_no" TEXT,
    "virtual_account_no" TEXT,
    "matched_type" TEXT,
    "matched_id" TEXT,
    "reconcile_status" TEXT NOT NULL DEFAULT 'unmatched',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost_center_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "employee_no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "location" TEXT,
    "department_id" TEXT,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "terminate_date" TIMESTAMP(3),
    "salary_base_original" DECIMAL(18,2) NOT NULL,
    "salary_base_currency" TEXT NOT NULL DEFAULT 'TWD',
    "salary_base_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "salary_base_base" DECIMAL(18,2) NOT NULL,
    "bank_info" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "pay_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount_original" DECIMAL(18,2) NOT NULL,
    "amount_currency" TEXT NOT NULL DEFAULT 'TWD',
    "amount_fx_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "amount_base" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "remark" TEXT,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "accounts_entity_id_type_idx" ON "accounts"("entity_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_entity_id_code_key" ON "accounts"("entity_id", "code");

-- CreateIndex
CREATE INDEX "periods_entity_id_status_idx" ON "periods"("entity_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "periods_entity_id_name_key" ON "periods"("entity_id", "name");

-- CreateIndex
CREATE INDEX "journal_entries_entity_id_date_idx" ON "journal_entries"("entity_id", "date");

-- CreateIndex
CREATE INDEX "journal_entries_source_module_source_id_idx" ON "journal_entries"("source_module", "source_id");

-- CreateIndex
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_channels_entity_id_code_key" ON "sales_channels"("entity_id", "code");

-- CreateIndex
CREATE INDEX "customers_entity_id_idx" ON "customers"("entity_id");

-- CreateIndex
CREATE INDEX "vendors_entity_id_idx" ON "vendors"("entity_id");

-- CreateIndex
CREATE INDEX "products_entity_id_idx" ON "products"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_entity_id_sku_key" ON "products"("entity_id", "sku");

-- CreateIndex
CREATE INDEX "sales_orders_entity_id_order_date_idx" ON "sales_orders"("entity_id", "order_date");

-- CreateIndex
CREATE INDEX "sales_orders_channel_id_idx" ON "sales_orders"("channel_id");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");

-- CreateIndex
CREATE INDEX "sales_order_items_sales_order_id_idx" ON "sales_order_items"("sales_order_id");

-- CreateIndex
CREATE INDEX "shipments_sales_order_id_idx" ON "shipments"("sales_order_id");

-- CreateIndex
CREATE INDEX "payments_entity_id_payout_date_idx" ON "payments"("entity_id", "payout_date");

-- CreateIndex
CREATE INDEX "payments_sales_order_id_idx" ON "payments"("sales_order_id");

-- CreateIndex
CREATE INDEX "ar_invoices_entity_id_status_idx" ON "ar_invoices"("entity_id", "status");

-- CreateIndex
CREATE INDEX "ar_invoices_due_date_idx" ON "ar_invoices"("due_date");

-- CreateIndex
CREATE INDEX "ap_invoices_entity_id_status_idx" ON "ap_invoices"("entity_id", "status");

-- CreateIndex
CREATE INDEX "ap_invoices_due_date_idx" ON "ap_invoices"("due_date");

-- CreateIndex
CREATE INDEX "ap_invoices_approval_status_idx" ON "ap_invoices"("approval_status");

-- CreateIndex
CREATE INDEX "expense_requests_entity_id_status_idx" ON "expense_requests"("entity_id", "status");

-- CreateIndex
CREATE INDEX "expense_requests_created_by_idx" ON "expense_requests"("created_by");

-- CreateIndex
CREATE INDEX "expenses_entity_id_expense_date_idx" ON "expenses"("entity_id", "expense_date");

-- CreateIndex
CREATE INDEX "expense_items_expense_id_idx" ON "expense_items"("expense_id");

-- CreateIndex
CREATE INDEX "approval_requests_entity_id_status_idx" ON "approval_requests"("entity_id", "status");

-- CreateIndex
CREATE INDEX "approval_requests_type_ref_id_idx" ON "approval_requests"("type", "ref_id");

-- CreateIndex
CREATE INDEX "purchase_orders_entity_id_order_date_idx" ON "purchase_orders"("entity_id", "order_date");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "product_batches_product_id_idx" ON "product_batches"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_entity_id_batch_code_key" ON "product_batches"("entity_id", "batch_code");

-- CreateIndex
CREATE INDEX "dev_costs_entity_id_status_idx" ON "dev_costs"("entity_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_entity_id_account_no_key" ON "bank_accounts"("entity_id", "account_no");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_bank_account_id_virtual_account_no_key" ON "virtual_accounts"("bank_account_id", "virtual_account_no");

-- CreateIndex
CREATE INDEX "bank_transactions_bank_account_id_txn_date_idx" ON "bank_transactions"("bank_account_id", "txn_date");

-- CreateIndex
CREATE INDEX "bank_transactions_reconcile_status_idx" ON "bank_transactions"("reconcile_status");

-- CreateIndex
CREATE INDEX "employees_entity_id_idx" ON "employees"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_entity_id_employee_no_key" ON "employees"("entity_id", "employee_no");

-- CreateIndex
CREATE INDEX "payroll_runs_entity_id_country_idx" ON "payroll_runs"("entity_id", "country");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_run_id_idx" ON "payroll_items"("payroll_run_id");

-- CreateIndex
CREATE INDEX "payroll_items_employee_id_idx" ON "payroll_items"("employee_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periods" ADD CONSTRAINT "periods_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channels" ADD CONSTRAINT "sales_channels_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "sales_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "sales_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_invoices" ADD CONSTRAINT "ap_invoices_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_invoices" ADD CONSTRAINT "ap_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_approval_user_id_fkey" FOREIGN KEY ("approval_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_costs" ADD CONSTRAINT "dev_costs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_costs" ADD CONSTRAINT "dev_costs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_accounts" ADD CONSTRAINT "virtual_accounts_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

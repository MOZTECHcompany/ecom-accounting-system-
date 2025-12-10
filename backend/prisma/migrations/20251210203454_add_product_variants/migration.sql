-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'BUNDLE', 'MANUFACTURED', 'SERVICE');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "has_serial_numbers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latest_purchase_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "moving_average_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "purchase_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sales_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'SIMPLE';

-- CreateTable
CREATE TABLE "inventory_serial_numbers" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "serial_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "inbound_ref_type" TEXT,
    "inbound_ref_id" TEXT,
    "outbound_ref_type" TEXT,
    "outbound_ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_orders" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ASSEMBLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_cost_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assembly_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_serial_numbers_serial_number_idx" ON "inventory_serial_numbers"("serial_number");

-- CreateIndex
CREATE INDEX "inventory_serial_numbers_status_idx" ON "inventory_serial_numbers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_serial_numbers_entity_id_product_id_serial_number_key" ON "inventory_serial_numbers"("entity_id", "product_id", "serial_number");

-- CreateIndex
CREATE INDEX "bill_of_materials_parent_id_idx" ON "bill_of_materials"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_of_materials_parent_id_child_id_key" ON "bill_of_materials"("parent_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "assembly_orders_order_no_key" ON "assembly_orders"("order_no");

-- CreateIndex
CREATE INDEX "assembly_orders_entity_id_status_idx" ON "assembly_orders"("entity_id", "status");

-- CreateIndex
CREATE INDEX "products_parent_id_idx" ON "products"("parent_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serial_numbers" ADD CONSTRAINT "inventory_serial_numbers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serial_numbers" ADD CONSTRAINT "inventory_serial_numbers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_serial_numbers" ADD CONSTRAINT "inventory_serial_numbers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

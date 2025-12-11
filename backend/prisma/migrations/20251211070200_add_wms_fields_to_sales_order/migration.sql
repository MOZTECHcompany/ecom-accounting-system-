-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "packer_id" TEXT,
ADD COLUMN     "picker_id" TEXT;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_picker_id_fkey" FOREIGN KEY ("picker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_packer_id_fkey" FOREIGN KEY ("packer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

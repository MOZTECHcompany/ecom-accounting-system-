/*
  Warnings:

  - You are about to drop the column `completed_at` on the `sales_orders` table. All the data in the column will be lost.
  - You are about to drop the column `packer_id` on the `sales_orders` table. All the data in the column will be lost.
  - You are about to drop the column `picker_id` on the `sales_orders` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_packer_id_fkey";

-- DropForeignKey
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_picker_id_fkey";

-- AlterTable
ALTER TABLE "expense_requests" ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "sales_orders" DROP COLUMN "completed_at",
DROP COLUMN "packer_id",
DROP COLUMN "picker_id";

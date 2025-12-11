/*
  Warnings:

  - You are about to drop the column `sn` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "sn",
ADD COLUMN     "model_number" TEXT;

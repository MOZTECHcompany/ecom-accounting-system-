-- AlterTable
ALTER TABLE "products" ADD COLUMN     "country_of_origin" TEXT,
ADD COLUMN     "gross_weight" DECIMAL(10,3),
ADD COLUMN     "hs_code" TEXT,
ADD COLUMN     "net_weight" DECIMAL(10,3),
ADD COLUMN     "package_height" DECIMAL(10,2),
ADD COLUMN     "package_length" DECIMAL(10,2),
ADD COLUMN     "package_width" DECIMAL(10,2);

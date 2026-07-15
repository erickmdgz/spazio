-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('supplier', 'public');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_supplierId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageLicense" TEXT,
ADD COLUMN     "source" "ProductSource" NOT NULL DEFAULT 'supplier',
ADD COLUMN     "sourceImageUrl" TEXT,
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ALTER COLUMN "supplierId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RenderItem" ADD COLUMN     "attribution" JSONB,
ADD COLUMN     "outboundUrl" TEXT,
ADD COLUMN     "source" "ProductSource" NOT NULL DEFAULT 'supplier';

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "RenderRequest" ADD COLUMN     "requestedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

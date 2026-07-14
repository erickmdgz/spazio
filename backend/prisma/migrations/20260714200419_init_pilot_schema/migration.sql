-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'finalized');

-- CreateEnum
CREATE TYPE "PhotoQualityStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "ProductClassification" AS ENUM ('ready_made', 'made_to_order');

-- CreateEnum
CREATE TYPE "ProductCompletenessStatus" AS ENUM ('incomplete', 'complete');

-- CreateEnum
CREATE TYPE "ProductApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "StyleStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "RenderRequestStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "RenderReviewStatus" AS ENUM ('pending_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('draft', 'confirmed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid_unforwarded', 'forwarded', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('created', 'sent_to_supplier', 'accepted', 'in_production', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'captured', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "OperatorRole" AS ENUM ('catalog_curator', 'render_reviewer', 'order_handler');

-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "OperatorRole",
    "status" "OperatorStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "roomWidthCm" INTEGER,
    "roomLengthCm" INTEGER,
    "roomHeightCm" INTEGER,
    "styleId" TEXT,
    "freeText" TEXT,
    "budgetMinCop" INTEGER,
    "budgetMaxCop" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "widthCm" INTEGER,
    "heightCm" INTEGER,
    "qualityStatus" "PhotoQualityStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "photos" TEXT[],
    "colors" TEXT[],
    "materials" TEXT[],
    "styleAttributes" TEXT[],
    "widthCm" INTEGER,
    "depthCm" INTEGER,
    "heightCm" INTEGER,
    "priceCop" INTEGER NOT NULL,
    "classification" "ProductClassification" NOT NULL,
    "stock" INTEGER,
    "productionLeadTimeDays" INTEGER,
    "deliveryLeadTimeDays" INTEGER NOT NULL,
    "warrantyTerms" TEXT NOT NULL,
    "completenessStatus" "ProductCompletenessStatus" NOT NULL DEFAULT 'incomplete',
    "approvalStatus" "ProductApprovalStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Style" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StyleStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "Style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "styleId" TEXT,
    "freeText" TEXT,
    "budgetMinCop" INTEGER,
    "budgetMaxCop" INTEGER,
    "status" "RenderRequestStatus" NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Render" (
    "id" TEXT NOT NULL,
    "renderRequestId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "imageKey" TEXT,
    "reviewStatus" "RenderReviewStatus" NOT NULL DEFAULT 'pending_review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "Render_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderItem" (
    "id" TEXT NOT NULL,
    "renderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tagPosition" JSONB,
    "priceCopSnapshot" INTEGER NOT NULL,

    CONSTRAINT "RenderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceCopSnapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "shippingName" TEXT,
    "shippingLine1" TEXT,
    "shippingCity" TEXT NOT NULL DEFAULT 'Bogota',
    "shippingRegion" TEXT,
    "shippingCountry" TEXT NOT NULL DEFAULT 'CO',
    "subtotalCop" INTEGER NOT NULL,
    "commissionCop" INTEGER NOT NULL,
    "totalCop" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'created',
    "subtotalCop" INTEGER NOT NULL DEFAULT 0,
    "forwardedAt" TIMESTAMP(3),
    "forwardedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountCop" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "projectId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE INDEX "Project_deviceToken_idx" ON "Project"("deviceToken");

-- CreateIndex
CREATE INDEX "RoomPhoto_projectId_idx" ON "RoomPhoto"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- CreateIndex
CREATE INDEX "Product_approvalStatus_idx" ON "Product"("approvalStatus");

-- CreateIndex
CREATE INDEX "Product_completenessStatus_idx" ON "Product"("completenessStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Style_code_key" ON "Style"("code");

-- CreateIndex
CREATE INDEX "DeliveryZone_supplierId_idx" ON "DeliveryZone"("supplierId");

-- CreateIndex
CREATE INDEX "RenderRequest_projectId_idx" ON "RenderRequest"("projectId");

-- CreateIndex
CREATE INDEX "Render_projectId_idx" ON "Render"("projectId");

-- CreateIndex
CREATE INDEX "Render_reviewStatus_idx" ON "Render"("reviewStatus");

-- CreateIndex
CREATE INDEX "RenderItem_renderId_idx" ON "RenderItem"("renderId");

-- CreateIndex
CREATE INDEX "RenderItem_productId_idx" ON "RenderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_projectId_key" ON "Cart"("projectId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE INDEX "Order_projectId_idx" ON "Order"("projectId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_orderId_idx" ON "PurchaseOrder"("orderId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_projectId_idx" ON "Event"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPhoto" ADD CONSTRAINT "RoomPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderRequest" ADD CONSTRAINT "RenderRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Render" ADD CONSTRAINT "Render_renderRequestId_fkey" FOREIGN KEY ("renderRequestId") REFERENCES "RenderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Render" ADD CONSTRAINT "Render_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Render" ADD CONSTRAINT "Render_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderItem" ADD CONSTRAINT "RenderItem_renderId_fkey" FOREIGN KEY ("renderId") REFERENCES "Render"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderItem" ADD CONSTRAINT "RenderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_forwardedById_fkey" FOREIGN KEY ("forwardedById") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BillKind" AS ENUM ('SESSION', 'COUNTER');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ProductCategory" ADD VALUE 'FOOD';

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sessionId" TEXT,
    "kind" "BillKind" NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'OPEN',
    "label" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "tableAmountSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itemTotalAmountSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmountSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "productId" TEXT,
    "category" "ProductCategory" NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "unitPriceAmount" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bill_businessId_status_kind_openedAt_idx" ON "Bill"("businessId", "status", "kind", "openedAt");

-- CreateIndex
CREATE INDEX "Bill_businessId_sessionId_status_idx" ON "Bill"("businessId", "sessionId", "status");

-- CreateIndex
CREATE INDEX "BillItem_businessId_billId_category_idx" ON "BillItem"("businessId", "billId", "category");

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

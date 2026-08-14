-- AlterTable
ALTER TABLE "ClubTable" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "ClubTable_businessId_active_idx" ON "ClubTable"("businessId", "active");

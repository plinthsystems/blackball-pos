ALTER TABLE "Product"
ADD COLUMN "stockOnHand" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "stockUnit" TEXT NOT NULL DEFAULT 'unit',
ADD COLUMN "unitsPerPack" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "stockUpdatedAt" TIMESTAMP(3);

UPDATE "Product"
SET "stockUnit" = 'stick', "unitsPerPack" = 10
WHERE "category" = 'CIGARETTES';

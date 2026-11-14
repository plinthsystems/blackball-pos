ALTER TABLE "Product"
ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Product"
SET "trackInventory" = true
WHERE left(id, 5) <> 'menu_'
  AND (
    "category" = 'CIGARETTES'
    OR "stockOnHand" > 0
    OR "stockUpdatedAt" IS NOT NULL
  );

UPDATE "Product"
SET "stockOnHand" = 0,
    "stockUpdatedAt" = NULL
WHERE left(id, 5) = 'menu_';

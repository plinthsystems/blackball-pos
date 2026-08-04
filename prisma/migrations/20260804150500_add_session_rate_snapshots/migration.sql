ALTER TABLE "Session"
ADD COLUMN "ps5MemberCount" INTEGER,
ADD COLUMN "hourlyRateSnapshot" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "Session"
SET "hourlyRateSnapshot" = COALESCE("TablePricing"."priceAmount", 0)
FROM "ClubTable"
LEFT JOIN "TablePricing"
  ON "TablePricing"."businessId" = "ClubTable"."businessId"
  AND "TablePricing"."gameType" = "ClubTable"."gameType"
  AND "TablePricing"."pricingGroup" = "ClubTable"."pricingGroup"
  AND "TablePricing"."durationMinutes" = 60
WHERE "Session"."tableId" = "ClubTable"."id"
  AND "Session"."hourlyRateSnapshot" = 0;

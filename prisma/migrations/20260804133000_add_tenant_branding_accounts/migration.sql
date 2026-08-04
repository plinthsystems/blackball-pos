CREATE TYPE "AccountType" AS ENUM ('STORE_USER', 'MANAGER');

ALTER TABLE "Business" ADD COLUMN "slug" TEXT;
UPDATE "Business"
SET "slug" = COALESCE(NULLIF(lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')), ''), "id")
WHERE "slug" IS NULL;
ALTER TABLE "Business" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

ALTER TABLE "BusinessSettings"
ADD COLUMN "appName" TEXT NOT NULL DEFAULT 'Black Ball',
ADD COLUMN "logoInitials" TEXT NOT NULL DEFAULT 'BB',
ADD COLUMN "brandColor" TEXT NOT NULL DEFAULT '#12613d',
ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#b98922';

ALTER TABLE "Employee" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'STORE_USER';
DROP INDEX IF EXISTS "Employee_email_key";
CREATE UNIQUE INDEX "Employee_businessId_email_key" ON "Employee"("businessId", "email");

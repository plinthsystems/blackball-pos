-- DropIndex
DROP INDEX "Employee_businessId_email_key";

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "bookingCloseHour" INTEGER NOT NULL DEFAULT 23,
ADD COLUMN     "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookingOpenHour" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "bookingWindowDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "requireConfirmation" BOOLEAN NOT NULL DEFAULT false;

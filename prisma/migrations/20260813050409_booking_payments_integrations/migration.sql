-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('NONE', 'RAZORPAY', 'STRIPE');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "advanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentExternalId" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "bookingAdvanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'NONE';

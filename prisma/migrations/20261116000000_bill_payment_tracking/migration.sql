CREATE TYPE "BillPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

ALTER TABLE "Bill"
ADD COLUMN "paymentStatus" "BillPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- Bills closed before payment tracking were already settled at the counter.
UPDATE "Bill"
SET "paymentStatus" = 'PAID'
WHERE "status" = 'CLOSED';

CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BillPayment_positive_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "BillPayment_cash_or_upi_check" CHECK ("method" IN ('CASH', 'UPI'))
);

CREATE INDEX "BillPayment_businessId_billId_createdAt_idx"
ON "BillPayment"("businessId", "billId", "createdAt");

ALTER TABLE "BillPayment"
ADD CONSTRAINT "BillPayment_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillPayment"
ADD CONSTRAINT "BillPayment_billId_fkey"
FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "ExpenseCategory" AS ENUM (
    'INVENTORY_PURCHASE',
    'GROCERIES',
    'UTILITIES',
    'RENT',
    'MAINTENANCE',
    'OTHER'
);

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "vendorName" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Expense_amount_positive_check" CHECK ("amount" > 0),
    CONSTRAINT "Expense_cash_or_upi_check" CHECK ("paymentMethod" IN ('CASH', 'UPI'))
);

CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "productId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "packs" INTEGER,
    "stockUnit" TEXT,
    "stockUnitsAdded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExpenseItem_amount_positive_check" CHECK ("amount" > 0),
    CONSTRAINT "ExpenseItem_stock_purchase_check" CHECK (
        ("packs" IS NULL AND "stockUnitsAdded" = 0)
        OR ("packs" > 0 AND "stockUnitsAdded" > 0)
    )
);

CREATE INDEX "Expense_businessId_spentAt_idx" ON "Expense"("businessId", "spentAt");
CREATE INDEX "Expense_businessId_category_spentAt_idx" ON "Expense"("businessId", "category", "spentAt");
CREATE INDEX "ExpenseItem_businessId_expenseId_idx" ON "ExpenseItem"("businessId", "expenseId");
CREATE INDEX "ExpenseItem_businessId_productId_idx" ON "ExpenseItem"("businessId", "productId");

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseItem"
ADD CONSTRAINT "ExpenseItem_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseItem"
ADD CONSTRAINT "ExpenseItem_expenseId_fkey"
FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseItem"
ADD CONSTRAINT "ExpenseItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

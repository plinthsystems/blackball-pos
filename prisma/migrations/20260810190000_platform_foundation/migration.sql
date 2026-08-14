DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationType') THEN
    CREATE TYPE "OrganizationType" AS ENUM ('INDEPENDENT_SAAS', 'FRANCHISE');
  END IF;
END $$;

ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'HQ_ADMIN';
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'STORE_OWNER';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingCycle') THEN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoyaltyBasis') THEN
    CREATE TYPE "RoyaltyBasis" AS ENUM ('GROSS_SALES', 'NET_SALES', 'FIXED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoyaltyInvoiceStatus') THEN
    CREATE TYPE "RoyaltyInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL DEFAULT 'INDEPENDENT_SAAS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "franchiseeId" TEXT;

CREATE TABLE IF NOT EXISTS "Franchisee" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Franchisee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Franchisee_organizationId_slug_key" ON "Franchisee"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "Franchisee_organizationId_active_idx" ON "Franchisee"("organizationId", "active");

ALTER TABLE "Employee" ALTER COLUMN "businessId" DROP NOT NULL;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "franchiseeId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "baseAmount" DECIMAL(12,2) NOT NULL,
  "pricePerOutletAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "setupFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "includedOutletCount" INTEGER NOT NULL DEFAULT 1,
  "features" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_organizationId_code_key" ON "SubscriptionPlan"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_active_billingCycle_idx" ON "SubscriptionPlan"("active", "billingCycle");

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "businessId" TEXT,
  "franchiseeId" TEXT,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "outletLimit" INTEGER,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "trialEndsAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Subscription_businessId_status_idx" ON "Subscription"("businessId", "status");
CREATE INDEX IF NOT EXISTS "Subscription_franchiseeId_status_idx" ON "Subscription"("franchiseeId", "status");

CREATE TABLE IF NOT EXISTS "RoyaltyRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "franchiseeId" TEXT,
  "name" TEXT NOT NULL,
  "basis" "RoyaltyBasis" NOT NULL DEFAULT 'GROSS_SALES',
  "rateBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "fixedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "minimumAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoyaltyRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RoyaltyRule_organizationId_active_idx" ON "RoyaltyRule"("organizationId", "active");
CREATE INDEX IF NOT EXISTS "RoyaltyRule_franchiseeId_active_idx" ON "RoyaltyRule"("franchiseeId", "active");

CREATE TABLE IF NOT EXISTS "RoyaltyInvoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "franchiseeId" TEXT NOT NULL,
  "ruleId" TEXT,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "grossSalesAmount" DECIMAL(12,2) NOT NULL,
  "royaltyAmount" DECIMAL(12,2) NOT NULL,
  "status" "RoyaltyInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoyaltyInvoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RoyaltyInvoice_organizationId_periodStart_periodEnd_idx" ON "RoyaltyInvoice"("organizationId", "periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "RoyaltyInvoice_franchiseeId_status_idx" ON "RoyaltyInvoice"("franchiseeId", "status");
CREATE INDEX IF NOT EXISTS "Business_organizationId_idx" ON "Business"("organizationId");
CREATE INDEX IF NOT EXISTS "Business_franchiseeId_idx" ON "Business"("franchiseeId");
CREATE INDEX IF NOT EXISTS "Employee_organizationId_idx" ON "Employee"("organizationId");
CREATE INDEX IF NOT EXISTS "Employee_franchiseeId_idx" ON "Employee"("franchiseeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Business_organizationId_fkey') THEN
    ALTER TABLE "Business" ADD CONSTRAINT "Business_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Franchisee_organizationId_fkey') THEN
    ALTER TABLE "Franchisee" ADD CONSTRAINT "Franchisee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Business_franchiseeId_fkey') THEN
    ALTER TABLE "Business" ADD CONSTRAINT "Business_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_organizationId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_franchiseeId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionPlan_organizationId_fkey') THEN
    ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_organizationId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_businessId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_franchiseeId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoyaltyRule_organizationId_fkey') THEN
    ALTER TABLE "RoyaltyRule" ADD CONSTRAINT "RoyaltyRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoyaltyRule_franchiseeId_fkey') THEN
    ALTER TABLE "RoyaltyRule" ADD CONSTRAINT "RoyaltyRule_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoyaltyInvoice_organizationId_fkey') THEN
    ALTER TABLE "RoyaltyInvoice" ADD CONSTRAINT "RoyaltyInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoyaltyInvoice_franchiseeId_fkey') THEN
    ALTER TABLE "RoyaltyInvoice" ADD CONSTRAINT "RoyaltyInvoice_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoyaltyInvoice_ruleId_fkey') THEN
    ALTER TABLE "RoyaltyInvoice" ADD CONSTRAINT "RoyaltyInvoice_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RoyaltyRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

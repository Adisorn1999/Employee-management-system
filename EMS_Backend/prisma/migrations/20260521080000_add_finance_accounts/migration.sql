CREATE TYPE "FinanceAccountCategory" AS ENUM ('PERSONAL_BANK', 'CORPORATE_BANK', 'WALLET', 'GATEWAY');
CREATE TYPE "FinanceAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED');
CREATE TYPE "FinanceFieldType" AS ENUM ('text', 'textarea', 'number', 'date', 'select', 'email', 'phone', 'password');

CREATE TABLE "finance_accounts" (
    "id" TEXT NOT NULL,
    "category" "FinanceAccountCategory" NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "status" "FinanceAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE,
    "expireDate" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_field_templates" (
    "id" TEXT NOT NULL,
    "category" "FinanceAccountCategory" NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_field_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_field_definitions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "labelTh" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "fieldType" "FinanceFieldType" NOT NULL DEFAULT 'text',
    "placeholder" TEXT,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "finance_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_account_field_values" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "labelSnapshot" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_account_field_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finance_field_templates_category_provider_name_key" ON "finance_field_templates"("category", "provider", "name");
CREATE UNIQUE INDEX "finance_field_definitions_templateId_fieldKey_key" ON "finance_field_definitions"("templateId", "fieldKey");
CREATE INDEX "finance_accounts_category_idx" ON "finance_accounts"("category");
CREATE INDEX "finance_accounts_provider_idx" ON "finance_accounts"("provider");
CREATE INDEX "finance_accounts_status_idx" ON "finance_accounts"("status");
CREATE INDEX "finance_accounts_expireDate_idx" ON "finance_accounts"("expireDate");
CREATE INDEX "finance_field_templates_category_provider_idx" ON "finance_field_templates"("category", "provider");
CREATE INDEX "finance_field_templates_isActive_idx" ON "finance_field_templates"("isActive");
CREATE INDEX "finance_field_definitions_templateId_idx" ON "finance_field_definitions"("templateId");
CREATE INDEX "finance_field_definitions_isActive_idx" ON "finance_field_definitions"("isActive");
CREATE INDEX "finance_account_field_values_accountId_idx" ON "finance_account_field_values"("accountId");
CREATE INDEX "finance_account_field_values_fieldKey_idx" ON "finance_account_field_values"("fieldKey");

ALTER TABLE "finance_field_definitions" ADD CONSTRAINT "finance_field_definitions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "finance_field_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_account_field_values" ADD CONSTRAINT "finance_account_field_values_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "finance_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

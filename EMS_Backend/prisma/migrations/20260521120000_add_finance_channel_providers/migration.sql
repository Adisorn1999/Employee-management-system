CREATE TYPE "FinanceChannelTypeCode" AS ENUM ('BANK', 'TRUEWALLET', 'GATEWAY');

CREATE TABLE "finance_channel_types" (
    "id" TEXT NOT NULL,
    "code" "FinanceChannelTypeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_channel_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_providers" (
    "id" TEXT NOT NULL,
    "channelTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_providers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "finance_field_templates"
ADD COLUMN "channelTypeId" TEXT,
ADD COLUMN "providerId" TEXT;

INSERT INTO "finance_channel_types" ("id", "code", "name", "description", "updatedAt")
VALUES
  ('finance_channel_bank', 'BANK', 'Bank', 'Bank accounts and bank payment channels', CURRENT_TIMESTAMP),
  ('finance_channel_truewallet', 'TRUEWALLET', 'TrueWallet', 'TrueMoney wallet channels', CURRENT_TIMESTAMP),
  ('finance_channel_gateway', 'GATEWAY', 'Gateway', 'Payment gateway channels', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "finance_providers" ("id", "channelTypeId", "code", "name", "updatedAt")
VALUES
  ('finance_provider_kbank', 'finance_channel_bank', 'KBANK', 'KBANK', CURRENT_TIMESTAMP),
  ('finance_provider_truemoney', 'finance_channel_truewallet', 'TRUEWALLET', 'TrueMoney', CURRENT_TIMESTAMP),
  ('finance_provider_opn', 'finance_channel_gateway', 'OPN', 'OPN', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

UPDATE "finance_field_templates"
SET
  "channelTypeId" = CASE
    WHEN "category" IN ('PERSONAL_BANK', 'CORPORATE_BANK') THEN 'finance_channel_bank'
    WHEN "category" = 'WALLET' THEN 'finance_channel_truewallet'
    WHEN "category" = 'GATEWAY' THEN 'finance_channel_gateway'
    ELSE "channelTypeId"
  END,
  "providerId" = CASE
    WHEN UPPER("provider") = 'KBANK' THEN 'finance_provider_kbank'
    WHEN UPPER("provider") IN ('TRUEWALLET', 'TRUEMONEY') THEN 'finance_provider_truemoney'
    WHEN UPPER("provider") = 'OPN' THEN 'finance_provider_opn'
    ELSE "providerId"
  END;

CREATE UNIQUE INDEX "finance_channel_types_code_key" ON "finance_channel_types"("code");
CREATE INDEX "finance_channel_types_isActive_idx" ON "finance_channel_types"("isActive");
CREATE UNIQUE INDEX "finance_providers_channelTypeId_code_key" ON "finance_providers"("channelTypeId", "code");
CREATE INDEX "finance_providers_channelTypeId_idx" ON "finance_providers"("channelTypeId");
CREATE INDEX "finance_providers_isActive_idx" ON "finance_providers"("isActive");
CREATE UNIQUE INDEX "finance_field_templates_providerId_name_key" ON "finance_field_templates"("providerId", "name");
CREATE INDEX "finance_field_templates_channelTypeId_idx" ON "finance_field_templates"("channelTypeId");
CREATE INDEX "finance_field_templates_providerId_idx" ON "finance_field_templates"("providerId");

ALTER TABLE "finance_providers"
ADD CONSTRAINT "finance_providers_channelTypeId_fkey"
FOREIGN KEY ("channelTypeId") REFERENCES "finance_channel_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finance_field_templates"
ADD CONSTRAINT "finance_field_templates_channelTypeId_fkey"
FOREIGN KEY ("channelTypeId") REFERENCES "finance_channel_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "finance_field_templates"
ADD CONSTRAINT "finance_field_templates_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "finance_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

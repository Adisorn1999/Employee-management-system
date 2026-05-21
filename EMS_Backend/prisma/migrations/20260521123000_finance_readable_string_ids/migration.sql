ALTER TABLE "finance_accounts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "finance_channel_types" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "finance_providers" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "finance_field_templates" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "finance_field_definitions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "finance_account_field_values" ALTER COLUMN "id" DROP DEFAULT;

UPDATE "finance_channel_types"
SET "id" = 'finance_channel_' || lower(regexp_replace("code"::text, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE "id" !~ '^finance_channel_';

UPDATE "finance_providers"
SET "id" = 'finance_provider_' || lower(regexp_replace("code", '[^a-zA-Z0-9]+', '_', 'g'))
WHERE "id" !~ '^finance_provider_';

UPDATE "finance_field_templates"
SET "id" =
  'finance_template_' ||
  lower(regexp_replace("provider", '[^a-zA-Z0-9]+', '_', 'g')) ||
  '_' ||
  lower(regexp_replace("name", '[^a-zA-Z0-9]+', '_', 'g'))
WHERE "id" !~ '^finance_template_';

UPDATE "finance_field_definitions"
SET "id" =
  'finance_definition_' ||
  lower(regexp_replace("templateId", '[^a-zA-Z0-9]+', '_', 'g')) ||
  '_' ||
  lower(regexp_replace("fieldKey", '[^a-zA-Z0-9]+', '_', 'g'))
WHERE "id" !~ '^finance_definition_';

UPDATE "finance_accounts"
SET "id" =
  'finance_account_' ||
  left(lower(regexp_replace(coalesce("displayName", 'account'), '[^a-zA-Z0-9]+', '_', 'g')), 48) ||
  '_' ||
  left(md5("id"), 8)
WHERE "id" !~ '^finance_account_';

WITH ranked_fields AS (
  SELECT
    "id",
    "accountId",
    "fieldKey",
    row_number() OVER (PARTITION BY "accountId" ORDER BY "sortOrder", "createdAt", "id") AS row_no
  FROM "finance_account_field_values"
)
UPDATE "finance_account_field_values" fav
SET "id" =
  'finance_account_field_' ||
  left(lower(regexp_replace(ranked_fields."accountId", '[^a-zA-Z0-9]+', '_', 'g')), 64) ||
  '_' ||
  left(lower(regexp_replace(coalesce(ranked_fields."fieldKey", ranked_fields.row_no::text), '[^a-zA-Z0-9]+', '_', 'g')), 48) ||
  '_' ||
  ranked_fields.row_no::text
FROM ranked_fields
WHERE fav."id" = ranked_fields."id"
  AND fav."id" !~ '^finance_account_field_';

UPDATE "finance_field_definitions"
SET
  "fieldKey" = 'usage_target',
  "labelTh" = 'ใช้งาน',
  "labelEn" = 'Usage'
WHERE "fieldKey" = 'lp_usage';

UPDATE "finance_account_field_values"
SET
  "fieldKey" = 'usage_target',
  "labelSnapshot" = 'ใช้งาน'
WHERE "fieldKey" = 'lp_usage';

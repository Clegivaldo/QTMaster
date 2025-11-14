-- Example cleanup: keep earliest created record for each duplicate CNPJ
-- WARNING: Review results before running. Backup your DB first.

-- 1) View duplicates with ids
SELECT cnpj, id, created_at
FROM clients
WHERE cnpj IS NOT NULL AND cnpj <> ''
ORDER BY cnpj, created_at;

-- 2) Example: delete all but earliest per cnpj (UNTESTED - run only after manual verification)
-- BEGIN TRANSACTION;
-- DELETE FROM clients
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, cnpj, ROW_NUMBER() OVER (PARTITION BY cnpj ORDER BY created_at ASC) AS rn
--     FROM clients
--     WHERE cnpj IS NOT NULL AND cnpj <> ''
--   ) t WHERE t.rn > 1
-- );
-- COMMIT;

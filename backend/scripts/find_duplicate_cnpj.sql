-- Find duplicate CNPJ values in clients
SELECT cnpj, COUNT(*) AS occurrences
FROM clients
WHERE cnpj IS NOT NULL AND cnpj <> ''
GROUP BY cnpj
HAVING COUNT(*) > 1;

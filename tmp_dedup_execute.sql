BEGIN;
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "sensorId", "timestamp", "rowNumber", "fileName"
    ORDER BY "createdAt" DESC, id DESC
  ) AS rn
  FROM "sensor_data"
  WHERE "fileName" = 'EF7217100050.xls'
)
DELETE FROM "sensor_data" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
COMMIT;

-- verification
SELECT COUNT(*) AS total_rows_after FROM "sensor_data" WHERE "fileName" = 'EF7217100050.xls';
SELECT COUNT(DISTINCT ("sensorId" || '|' || "timestamp"::text || '|' || COALESCE("rowNumber"::text,''))) AS distinct_groups_after
FROM "sensor_data" WHERE "fileName" = 'EF7217100050.xls';

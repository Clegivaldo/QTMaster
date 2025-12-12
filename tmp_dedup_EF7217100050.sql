-- 1) create backup table of affected rows
DROP TABLE IF EXISTS backup_sensor_data_EF7217100050;
CREATE TABLE backup_sensor_data_EF7217100050 AS
SELECT * FROM "sensor_data" WHERE "fileName" = 'EF7217100050.xls';

-- 2) dry-run: count duplicates (rn>1)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "sensorId", "timestamp", "rowNumber", "fileName"
    ORDER BY "createdAt" DESC, id DESC
  ) AS rn
  FROM "sensor_data"
  WHERE "fileName" = 'EF7217100050.xls'
)
SELECT COUNT(*) AS duplicates_will_be_deleted FROM ranked WHERE rn > 1;

-- 3) show sample of groups with rn>1 (limit 20)
WITH ranked AS (
  SELECT id, "sensorId", "timestamp", "rowNumber", "fileName", "createdAt",
         ROW_NUMBER() OVER (
           PARTITION BY "sensorId", "timestamp", "rowNumber", "fileName"
           ORDER BY "createdAt" DESC, id DESC
         ) AS rn
  FROM "sensor_data"
  WHERE "fileName" = 'EF7217100050.xls'
)
SELECT * FROM ranked WHERE rn > 1 ORDER BY "timestamp" LIMIT 20;

-- 4) perform deletion (comment/uncomment below to execute)
-- BEGIN;
-- WITH ranked AS (
--   SELECT id, ROW_NUMBER() OVER (
--     PARTITION BY "sensorId", "timestamp", "rowNumber", "fileName"
--     ORDER BY "createdAt" DESC, id DESC
--   ) AS rn
--   FROM "sensor_data"
--   WHERE "fileName" = 'EF7217100050.xls'
-- )
-- DELETE FROM "sensor_data" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
-- COMMIT;

-- 5) post-action verification (run after deletion)
SELECT COUNT(*) AS total_rows_after FROM "sensor_data" WHERE "fileName" = 'EF7217100050.xls';
SELECT COUNT(DISTINCT ("sensorId" || '|' || "timestamp"::text || '|' || COALESCE("rowNumber"::text,''))) AS distinct_groups_after
FROM "sensor_data" WHERE "fileName" = 'EF7217100050.xls';

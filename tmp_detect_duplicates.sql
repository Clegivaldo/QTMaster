-- sample duplicate groups (limit 50)
SELECT "sensorId", "timestamp", "rowNumber", COUNT(*) AS cnt
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls'
GROUP BY "sensorId", "timestamp", "rowNumber"
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- total rows for file
SELECT COUNT(*) AS total_rows
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls';

-- distinct groups by sensorId|timestamp|rowNumber
SELECT COUNT(DISTINCT ("sensorId" || '|' || "timestamp"::text || '|' || COALESCE("rowNumber"::text,''))) AS distinct_groups
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls';

-- estimated duplicate rows (total - distinct_groups)
SELECT ( (SELECT COUNT(*) FROM "sensor_data" WHERE "fileName" = 'EF7217100050.xls') -
         (SELECT COUNT(DISTINCT ("sensorId" || '|' || "timestamp"::text || '|' || COALESCE("rowNumber"::text,'')))
          FROM "sensor_data" WHERE "fileName" = 'EF7217100050.xls') ) AS duplicate_rows_estimate;

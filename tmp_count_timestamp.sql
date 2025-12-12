-- count by timestamp range for file EF7217100050.xls
SELECT COUNT(*) AS cnt_timestamp_range
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls'
  AND "timestamp" >= '2025-11-11T16:34:28Z' AND "timestamp" <= '2025-12-11T23:04:28Z';

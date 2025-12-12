-- counts per day for file EF7217100050.xls (createdAt)
SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS cnt
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls'
GROUP BY day
ORDER BY day;

-- overall min/max createdAt and timestamp for the file
SELECT MIN("createdAt") AS min_createdAt, MAX("createdAt") AS max_createdAt,
       MIN("timestamp") AS min_timestamp, MAX("timestamp") AS max_timestamp
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls';

-- distinct createdAt days count
SELECT COUNT(DISTINCT date_trunc('day', "createdAt")) AS distinct_createdat_days
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls';

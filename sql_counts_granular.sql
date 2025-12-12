-- count by createdAt near import time
SELECT COUNT(*) AS cnt_createdat
FROM "sensor_data"
WHERE "sensorId" = 'cmizwmyge0a1tp651j148cgzg'
  AND "createdAt" >= '2025-12-11T13:53:00Z' AND "createdAt" <= '2025-12-11T14:10:00Z';

-- count by fileName for that sensor
SELECT COUNT(*) AS cnt_file_sensor
FROM "sensor_data"
WHERE "sensorId" = 'cmizwmyge0a1tp651j148cgzg'
  AND "fileName" = 'EF7217100050.xls';

-- count by fileName overall
SELECT COUNT(*) AS cnt_file_overall
FROM "sensor_data"
WHERE "fileName" = 'EF7217100050.xls';

SELECT "id","sensorId","timestamp","temperature","humidity","fileName","rowNumber","validationId","createdAt"
FROM "public"."sensor_data"
ORDER BY "createdAt" DESC
LIMIT 10;

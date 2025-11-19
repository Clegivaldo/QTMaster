SELECT s."id", s."serialNumber"
FROM "public"."sensors" s
JOIN "public"."suitcase_sensors" ss ON ss."sensorId" = s."id"
WHERE ss."suitcaseId" = 'cmi5wyins0003mv0tkui49liy';

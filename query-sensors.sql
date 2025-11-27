SELECT s.id, s."serialNumber", s.model, st.name as type_name 
FROM sensors s 
JOIN sensor_types st ON s."typeId" = st.id 
ORDER BY s."createdAt" DESC 
LIMIT 10;

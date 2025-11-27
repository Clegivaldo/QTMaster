# Script para debugar dados de múltiplos sensores

$validationId = Read-Host "Digite o ID da validação"

Write-Host "`n=== Testando endpoint de validação ===" -ForegroundColor Cyan

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/validations/$validationId" `
    -Method GET `
    -Headers @{
        "Authorization" = "Bearer $(Read-Host 'Digite o token JWT')"
    }

Write-Host "`nValidation Name: $($response.name)" -ForegroundColor Green
Write-Host "Total sensorData count: $($response.sensorData.Count)" -ForegroundColor Yellow

# Contar sensores únicos
$uniqueSensors = $response.sensorData | Select-Object -ExpandProperty sensor | Select-Object -Property id, serialNumber -Unique

Write-Host "`n=== Sensores Únicos ===" -ForegroundColor Cyan
$uniqueSensors | ForEach-Object {
    Write-Host "  ID: $($_.id) | Serial: $($_.serialNumber)" -ForegroundColor Magenta
}
Write-Host "Total sensores únicos: $($uniqueSensors.Count)" -ForegroundColor Yellow

# Mostrar primeiras 5 leituras
Write-Host "`n=== Primeiras 5 leituras ===" -ForegroundColor Cyan
$response.sensorData | Select-Object -First 5 | ForEach-Object {
    Write-Host "  Sensor: $($_.sensor.serialNumber) | Temp: $($_.temperature) | Hum: $($_.humidity) | Time: $($_.timestamp)" -ForegroundColor White
}

# Verificar se há hiddenSensorIds
Write-Host "`n=== Hidden Sensors ===" -ForegroundColor Cyan
if ($response.hiddenSensorIds) {
    Write-Host "hiddenSensorIds: $($response.hiddenSensorIds -join ', ')" -ForegroundColor Red
} else {
    Write-Host "Nenhum sensor oculto" -ForegroundColor Green
}

# Salvar resposta completa em JSON
$response | ConvertTo-Json -Depth 10 | Out-File "debug-validation-$validationId.json"
Write-Host "`nResposta completa salva em: debug-validation-$validationId.json" -ForegroundColor Green

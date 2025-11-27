# Smoke test dos endpoints de critérios e seleção de sensores
$ErrorActionPreference = 'Stop'
function Write-Title($text){ Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Write-Ok($text){ Write-Host $text -ForegroundColor Green }
function Write-Err($text){ Write-Host $text -ForegroundColor Red }

try {
  Write-Title "Login"
  $loginPath = Join-Path $PSScriptRoot 'test-login.json'
  if(-not (Test-Path $loginPath)){ throw "Arquivo test-login.json não encontrado em $loginPath" }
  $login = Get-Content -Raw -Path $loginPath | ConvertFrom-Json
  $resp = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/auth/login" -ContentType "application/json" -Body ($login | ConvertTo-Json)
  $TOKEN = $resp.data.accessToken
  if(-not $TOKEN){ throw "Token ausente na resposta de login" }
  Write-Ok "TOKEN_OK (${($TOKEN.Length)} chars)"

  Write-Title "Buscar validação"
  $vals = Invoke-RestMethod -Method Get -Uri "http://localhost:3001/api/validations?limit=1" -Headers @{ Authorization = "Bearer $TOKEN" }
  if(-not $vals.data.validations -or $vals.data.validations.Count -eq 0){ throw "Nenhuma validação encontrada (crie uma e importe dados)." }
  $VID = $vals.data.validations[0].id
  Write-Ok "VALIDATION_ID: $VID"

  Write-Title "Atualizar critérios"
  $critBody = @{ minTemperature = 2.0; maxTemperature = 8.0; minHumidity = 45; maxHumidity = 75 } | ConvertTo-Json
  $crit = Invoke-RestMethod -Method Put -Uri "http://localhost:3001/api/validations/$VID/criteria" -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body $critBody
  if(-not $crit.success){ throw "Falha ao atualizar critérios" }
  Write-Ok ("CRITERIA_OK: min={0} max={1} hmin={2} hmax={3}" -f $crit.data.validation.minTemperature,$crit.data.validation.maxTemperature,$crit.data.validation.minHumidity,$crit.data.validation.maxHumidity)

  Write-Title "Descobrir sensores"
  $sd = Invoke-RestMethod -Method Get -Uri "http://localhost:3001/api/validations/$VID" -Headers @{ Authorization = "Bearer $TOKEN" }
  $distinctSensorIds = @()
  if($sd.data.validation.sensorData){
    $distinctSensorIds = ($sd.data.validation.sensorData | ForEach-Object { $_.sensor.id } | Sort-Object -Unique)
  }
  if(-not $distinctSensorIds -or $distinctSensorIds.Count -eq 0){
    Write-Host "Sem sensorData no topo, usando chart-data..."
    $chart = Invoke-RestMethod -Method Get -Uri "http://localhost:3001/api/validations/$VID/chart-data" -Headers @{ Authorization = "Bearer $TOKEN" }
    if($chart.data.chartData){
      $distinctSensorIds = ($chart.data.chartData | ForEach-Object { $_.sensorId } | Sort-Object -Unique)
    }
  }
  if(-not $distinctSensorIds -or $distinctSensorIds.Count -eq 0){ throw "Nenhum sensor associado à validação $VID" }
  Write-Ok ("SENSORS: {0}" -f ($distinctSensorIds -join ','))

  Write-Title "Persistir seleção"
  $take = [Math]::Max(1, [Math]::Floor($distinctSensorIds.Count / 2))
  $selected = $distinctSensorIds | Select-Object -First $take
  $selBody = @{ selectedSensorIds = $selected } | ConvertTo-Json
  $sel = Invoke-RestMethod -Method Put -Uri "http://localhost:3001/api/validations/$VID/sensors/selection" -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body $selBody
  if(-not $sel.success){ throw "Falha ao salvar seleção" }
  Write-Ok ("SELECTION_OK: selected={0} hidden={1}" -f ($selected -join ','), ($sel.data.validation.hiddenSensorIds.Count))

  Write-Title "OK"
  Write-Ok "Smoke test finalizado com sucesso."
}
catch {
  Write-Err ("ERRO: {0}" -f $_)
  exit 1
}

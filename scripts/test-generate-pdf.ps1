$base='http://localhost:3000'
Write-Host "1) Fazendo login..."
$body = @{ email='admin@laudo.com'; password='admin123' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -Body $body -ContentType 'application/json' -UseBasicParsing
} catch {
  Write-Host "Login falhou" -ForegroundColor Red
  Write-Host $_
  exit 1
}
Write-Host "Login OK"
$token = $login.data.tokens.accessToken
Write-Host "Token length: $($token.Length)"

$templateId='e7f52dab-f73d-4411-9e60-ca52675707d3'
$validationId='cmj2spg2t0003oc4ie4hsb7t1'
$genBody = @{ validationId = $validationId } | ConvertTo-Json
Write-Host "2) Iniciando geração de PDF (salvando como report.pdf)..."
try {
  Invoke-RestMethod -Method Post -Uri "$base/api/editor-templates/$templateId/generate-pdf" -Body $genBody -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -OutFile 'report.pdf' -UseBasicParsing -ErrorAction Stop
  $info = Get-Item -Path 'report.pdf'
  Write-Host "PDF salvo: report.pdf - $($info.Length) bytes"
} catch {
  Write-Host "Erro ao gerar/baixar PDF" -ForegroundColor Red
  Write-Host $_
  # Tentar obter preview HTML para debugging
  try {
    Write-Host '-> Tentando obter preview HTML...'
    $preview = Invoke-RestMethod -Method Post -Uri "$base/api/editor-templates/$templateId/preview-html" -Body (ConvertTo-Json @{ validationId = $validationId }) -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -ErrorAction Stop
    $preview.data.html | Out-File -FilePath 'preview.html' -Encoding utf8
    Write-Host 'Preview salvo: preview.html'
  } catch {
    Write-Host "Falha ao obter preview: $($_.Exception.Message)"
  }
  exit 1
}

$base="http://localhost:3000"
Write-Host "1) Login..."
$body = @{ email="admin@laudo.com"; password="admin123" } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -Body $body -ContentType "application/json" -UseBasicParsing
} catch {
  Write-Host "Login failed"
  Write-Host $_
  exit 1
}
Write-Host "Login OK"
$token = $login.data.tokens.accessToken
Write-Host ("Token length: " + $token.Length)

$templateId="f05f01ed-0738-4a8d-9892-8d496db14300"
$validationId="7153ca90-8bec-47e8-9a71-7a051b06a944"
$genBody = @{ validationId = $validationId } | ConvertTo-Json
Write-Host "2) Starting PDF job..."
try {
  $gen = Invoke-RestMethod -Method Post -Uri "$base/api/editor-templates/$templateId/generate-pdf" -Body $genBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -UseBasicParsing
} catch {
  Write-Host "Start job error"
  Write-Host $_
  exit 1
}

if ($null -eq $gen) { Write-Host "Empty response"; exit 1 }
if ($gen.data -and $gen.data.jobId) { $jobId = $gen.data.jobId; Write-Host ("JobId: " + $jobId) } else { Write-Host "No jobId returned"; Write-Host ($gen | ConvertTo-Json -Depth 5); exit 1 }

Start-Sleep -Seconds 5
Write-Host "3) Checking job status..."
try {
  $resp = Invoke-WebRequest -Uri "$base/api/editor-templates/$templateId/generate-pdf/$jobId/status" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 120
} catch {
  Write-Host "Status error"
  Write-Host $_
  exit 1
}

$ct = $resp.Headers['Content-Type']
Write-Host ("Content-Type: " + $ct)

if ($ct -and $ct -like "*pdf*") {
  $bytes = $resp.RawContentLength
  if (-not $bytes) { $bytes = $resp.Content.Length }
  Write-Host ("PDF received size: " + $bytes)
} else {
  $txt = $resp.Content
  if ($txt.Length -gt 2000) { Write-Host ($txt.Substring(0,2000) + "... (truncated)") } else { Write-Host $txt }
}

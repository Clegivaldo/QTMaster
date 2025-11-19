param(
  [string]$jobIdFile = 'upload_response_pretty.json'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $jobIdFile)) { Write-Error "Job response file $jobIdFile not found"; exit 1 }
$uploadResp = Get-Content $jobIdFile | ConvertFrom-Json
$jobId = $uploadResp.data.jobId
if (-not $jobId) { Write-Error 'jobId not found in upload response'; exit 1 }
Write-Output "JobId: $jobId"
Write-Output 'Logging in to get token...'
$login = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -ContentType 'application/json' -Body (@{email='admin@laudo.com'; password='admin123'} | ConvertTo-Json)
$token = $login.data.tokens.accessToken
if (-not $token) { Write-Error 'No token'; exit 1 }
$headers = @{ Authorization = "Bearer $token" }
$attempt = 0
$maxAttempts = 90
while ($attempt -lt $maxAttempts) {
  $attempt++
  try {
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/files/processing-status/$jobId" -Headers $headers -Method Get
    $progress = $status.data.progress
    $state = $status.data.status
    Write-Output "Attempt $attempt - state=$state - progress=$progress%"
    $status | ConvertTo-Json -Depth 6 | Out-File -FilePath "processing_status.json"
    if ($progress -ge 100 -or $state -eq 'completed' -or $state -eq 'failed') { Write-Output 'Job finished or reached 100%'; break }
  } catch {
    Write-Output "Attempt $attempt - error polling status: $_"
  }
  Start-Sleep -Seconds 2
}
Write-Output 'Saved processing_status.json'

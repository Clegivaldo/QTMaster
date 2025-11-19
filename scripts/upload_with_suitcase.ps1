$ErrorActionPreference = "Stop"
Write-Output "Logging in..."
$login = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -ContentType 'application/json' -Body (@{email='admin@laudo.com'; password='admin123'} | ConvertTo-Json)
$token = $login.data.tokens.accessToken
if (-not $token) { Write-Error 'No token returned from login'; exit 1 }
Write-Output "Got token length: $($token.Length)"
Write-Output "Fetching suitcases..."
$s = Invoke-RestMethod -Uri 'http://localhost:3001/api/suitcases' -Headers @{Authorization = "Bearer $token"} -Method Get
$s | ConvertTo-Json -Depth 5 | Out-File -FilePath suitcase_response.json
if ($s.data.suitcases -and $s.data.suitcases.Count -gt 0) { $suitcaseId = $s.data.suitcases[0].id } else { Write-Error 'No suitcases returned'; exit 1 }
Write-Output "Using suitcaseId: $suitcaseId"
Write-Output "Uploading test-small.csv using curl.exe..."
$curlCmd = 'curl.exe -s -X POST "http://localhost:3001/api/files/upload" -H "Authorization: Bearer ' + $token + '" -F "files=@test-small.csv;type=text/csv" -F "suitcaseId=' + $suitcaseId + '" -o upload_response.json'
Write-Output "Running curl.exe upload..."
cmd /c $curlCmd
if (Test-Path upload_response.json) { Get-Content upload_response.json | Out-File -FilePath upload_response_pretty.json; Write-Output 'Saved upload_response.json and upload_response_pretty.json' } else { Write-Error 'Upload failed or upload_response.json not created' ; exit 1 }

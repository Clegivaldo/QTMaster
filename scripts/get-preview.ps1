$base='http://localhost:3000'
Write-Host "Logging in..."
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -Body (@{ email='admin@laudo.com'; password='admin123' } | ConvertTo-Json) -ContentType 'application/json'
$token = $login.data.tokens.accessToken
Write-Host "Token length: $($token.Length)"
$templateId='e7f52dab-f73d-4411-9e60-ca52675707d3'
$validationId='cmj2spg2t0003oc4ie4hsb7t1'
$body = @{ validationId = $validationId } | ConvertTo-Json
Write-Host "Requesting preview HTML..."
$preview = Invoke-RestMethod -Method Post -Uri "$base/api/editor-templates/$templateId/preview-html" -Body $body -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" }
$preview.data.html | Out-File -FilePath "preview.html" -Encoding utf8
Write-Host "Saved preview.html"

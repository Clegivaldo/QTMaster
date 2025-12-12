$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$creds = @{ email = 'admin@laudo.com'; password = 'admin123' } | ConvertTo-Json
Write-Host 'Logging in...'
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -Body $creds -ContentType 'application/json'
$token = $null
if ($login -and $login.data) {
    if ($login.data.token) { $token = $login.data.token }
    elseif ($login.data.tokens -and $login.data.tokens.accessToken) { $token = $login.data.tokens.accessToken }
}
if (-not $token) { Write-Host 'No token'; exit 1 }
Write-Host 'Token OK'
$templates = Invoke-RestMethod -Method Get -Uri "$base/api/editor-templates?limit=200" -Headers @{ Authorization = "Bearer $token" }
if ($templates -and $templates.data -and $templates.data.templates) {
    foreach ($t in $templates.data.templates) {
        if ($t.name -ne '123') {
            Write-Host "Deleting template: $($t.name) ($($t.id))"
            try {
                Invoke-RestMethod -Method Delete -Uri "$base/api/editor-templates/$($t.id)" -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
                Write-Host 'Deleted'
            } catch {
                Write-Host "Delete failed: $($_.Exception.Message)"
            }
        } else {
            Write-Host "Keeping template: $($t.name) ($($t.id))"
        }
    }
} else { Write-Host 'No templates found' }

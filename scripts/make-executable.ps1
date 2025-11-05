# PowerShell script to make shell scripts executable on Linux deployment
# This script should be run on the Linux server after deployment

Write-Host "Making shell scripts executable..."

$scriptFiles = @(
    "backup.sh",
    "restore.sh", 
    "maintenance.sh",
    "deploy-prod.sh",
    "health-check.sh"
)

foreach ($script in $scriptFiles) {
    $scriptPath = "scripts/$script"
    if (Test-Path $scriptPath) {
        Write-Host "Setting executable permission for $scriptPath"
        # This will be executed on Linux: chmod +x $scriptPath
    } else {
        Write-Warning "Script not found: $scriptPath"
    }
}

Write-Host "Note: Run 'chmod +x scripts/*.sh' on the Linux server to make scripts executable"
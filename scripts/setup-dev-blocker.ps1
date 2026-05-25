# Dev convenience: wires up the blocker for testing without going through
# the Electron installer.
#
# Generates an API token, writes blocker-config.json to %APPDATA%\life-os,
# appends LIFE_OS_API_TOKEN to .env.local, and registers the Scheduled Task.
#
# Run once from the project root:  pwsh -File scripts/setup-dev-blocker.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile     = Join-Path $ProjectRoot ".env.local"
$AppData     = Join-Path $env:APPDATA "life-os"
$ConfigPath  = Join-Path $AppData "blocker-config.json"
$BlockerPath = Join-Path $ProjectRoot "resources\blocker.ps1"
$InstallPath = Join-Path $ProjectRoot "resources\install-blocker.ps1"
$ApiPort     = 3000  # default dev port; change if you run next on a different port

# 1. Read or generate API token (reuse existing if present)
if (Test-Path $ConfigPath) {
  $existing = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  $token = $existing.token
  Write-Host "Reusing existing token from $ConfigPath"
} else {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $token = [Convert]::ToBase64String($bytes) -replace '[+/=]', ''
  Write-Host "Generated new token"
}

# 2. Write blocker-config.json
New-Item -ItemType Directory -Force -Path $AppData | Out-Null
$config = [ordered]@{
  apiUrl          = "http://127.0.0.1:$ApiPort"
  token           = $token
  intervalSeconds = 30
} | ConvertTo-Json
Set-Content -Path $ConfigPath -Value $config -Force
Write-Host "Wrote $ConfigPath"

# 3. Update .env.local (add or replace LIFE_OS_API_TOKEN)
$envContent = ""
if (Test-Path $EnvFile) {
  $envContent = Get-Content $EnvFile -Raw
}
if ($envContent -match "(?m)^LIFE_OS_API_TOKEN=") {
  $envContent = $envContent -replace "(?m)^LIFE_OS_API_TOKEN=.*$", "LIFE_OS_API_TOKEN=$token"
} else {
  if ($envContent.Length -gt 0 -and -not $envContent.EndsWith("`n")) {
    $envContent += "`r`n"
  }
  $envContent += "LIFE_OS_API_TOKEN=$token`r`n"
}
Set-Content -Path $EnvFile -Value $envContent -Force -NoNewline
Write-Host "Updated $EnvFile"

# 4. Register the Scheduled Task (will UAC-prompt)
Write-Host ""
Write-Host "Registering Scheduled Task (UAC prompt incoming)..."
& $InstallPath -ScriptPath $BlockerPath

Write-Host ""
Write-Host "Setup complete."
Write-Host "Next steps:"
Write-Host "  1. Restart 'pnpm dev' so the new env var is picked up."
Write-Host "  2. The blocker is now running. Visit Instagram in your browser."
Write-Host "  3. Log Meditation today on /today — Instagram unblocks within ~30s."

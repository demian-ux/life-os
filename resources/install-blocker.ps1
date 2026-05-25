# Life OS — Register the privileged blocker as a Scheduled Task.
#
# Run as Administrator (the script will self-elevate via UAC if needed).
# Idempotent — re-running updates the task to point at the supplied script.

[CmdletBinding()]
param(
  [string]$ScriptPath = (Join-Path $PSScriptRoot "blocker.ps1")
)

$TaskName = "LifeOS-Blocker"

if (-not (Test-Path $ScriptPath)) {
  Write-Error "blocker.ps1 not found at: $ScriptPath"
  exit 1
}

# Self-elevate if not already admin.
$current = [Security.Principal.WindowsPrincipal]::new(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Re-launching with administrator rights..."
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -ScriptPath `"$ScriptPath`"" `
    -Verb RunAs
  exit
}

Write-Host "Registering Scheduled Task: $TaskName"

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Life OS site-blocker — maintains hosts file based on habit guards" `
  -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host "Done. Blocker is running."

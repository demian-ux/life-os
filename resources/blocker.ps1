# Life OS — Privileged blocker
#
# Polls the Life OS API for the current desired-blocked-domain list and
# reconciles the marked section of the system hosts file.
#
# Runs as a Scheduled Task with highest privileges (registered by
# install-blocker.ps1). Logs to %APPDATA%\life-os\blocker.log.

$ErrorActionPreference = "Continue"

$AppData    = Join-Path $env:APPDATA "life-os"
$ConfigPath = Join-Path $AppData "blocker-config.json"
$LogPath    = Join-Path $AppData "blocker.log"
$HostsPath  = Join-Path $env:windir "System32\drivers\etc\hosts"

$StartMarker = "# --- LIFE OS START (managed - do not edit) ---"
$EndMarker   = "# --- LIFE OS END ---"

New-Item -ItemType Directory -Force -Path $AppData | Out-Null

function Write-Log($msg) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  try {
    Add-Content -Path $LogPath -Value "$stamp $msg"
  } catch {}
}

function Read-Config {
  if (-not (Test-Path $ConfigPath)) { return $null }
  try {
    return Get-Content $ConfigPath -Raw | ConvertFrom-Json
  } catch {
    Write-Log "Config parse error: $_"
    return $null
  }
}

function Set-HostsBlock([string[]]$domains) {
  $lines = @()
  foreach ($d in ($domains | Sort-Object -Unique)) {
    $lines += "127.0.0.1 $d"
    $lines += "::1 $d"
  }
  $newBlock = $lines -join "`r`n"

  $current = ""
  if (Test-Path $HostsPath) {
    $current = Get-Content $HostsPath -Raw
  }
  $startIdx = $current.IndexOf($StartMarker)
  $endIdx   = $current.IndexOf($EndMarker)

  if ($startIdx -lt 0 -or $endIdx -lt 0) {
    $updated = $current.TrimEnd() + "`r`n`r`n$StartMarker`r`n$newBlock`r`n$EndMarker`r`n"
  } else {
    $before     = $current.Substring(0, $startIdx)
    $afterStart = $endIdx + $EndMarker.Length
    $after      = if ($afterStart -lt $current.Length) { $current.Substring($afterStart) } else { "" }
    $updated    = $before + $StartMarker + "`r`n" + $newBlock + "`r`n" + $EndMarker + $after
  }

  Set-Content -Path $HostsPath -Value $updated -Force -NoNewline
  ipconfig /flushdns | Out-Null
}

Write-Log "Blocker started (pid=$PID)"

$lastApplied = "<unset>"
$config = $null

while ($true) {
  $config = Read-Config
  if ($null -eq $config -or -not $config.apiUrl -or -not $config.token) {
    Start-Sleep -Seconds 10
    continue
  }

  try {
    $headers = @{ "X-Life-OS-Token" = $config.token }
    $response = Invoke-RestMethod `
      -Uri "$($config.apiUrl)/api/v1/blocker/state" `
      -Headers $headers `
      -TimeoutSec 10 `
      -ErrorAction Stop

    $desired = @()
    if ($response.blockedDomains) {
      $desired = @($response.blockedDomains)
    }
    $sig = ($desired | Sort-Object -Unique) -join ","
    if ($sig -ne $lastApplied) {
      Set-HostsBlock $desired
      $lastApplied = $sig
      Write-Log "Applied: $($desired.Count) domain(s) blocked"
    }
  } catch {
    # Server unreachable is expected when the app isn't running — keep polling
    # quietly. Log other errors.
    if ($_.Exception.Message -notmatch "Unable to connect|actively refused") {
      Write-Log "Poll error: $($_.Exception.Message)"
    }
  }

  $interval = 30
  if ($config.intervalSeconds) {
    $interval = [int]$config.intervalSeconds
    if ($interval -lt 5) { $interval = 5 }
  }
  Start-Sleep -Seconds $interval
}

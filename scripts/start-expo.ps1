param(
  [int]$Port = 8081,
  [switch]$Clear,
  [switch]$Tunnel
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

& "$PSScriptRoot\kill-port.ps1" -Port $Port

$lanHost = node "$PSScriptRoot\print-lan-host.mjs"
if (-not $lanHost -or $lanHost -eq '127.0.0.1') {
  Write-Host '[travu] LAN IP를 찾지 못했습니다. PC와 폰이 같은 Wi-Fi인지 확인하세요.' -ForegroundColor Yellow
} else {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanHost
  Write-Host "[travu] LAN host: $lanHost" -ForegroundColor Cyan
  Write-Host "[travu] Expo Go URL: exp://${lanHost}:${Port}" -ForegroundColor Green
}

try {
  & "$PSScriptRoot\setup-expo-firewall.ps1" -Port $Port
  Write-Host "[travu] 방화벽 규칙 확인됨 (포트 $Port)" -ForegroundColor DarkGray
} catch {
  Write-Host '[travu] 방화벽 규칙 추가 실패 — 관리자 PowerShell에서 npm run start:lan 을 실행하세요.' -ForegroundColor Yellow
}

Push-Location $root
try {
  $expoArgs = @('expo', 'start', '--port', $Port)
  if ($Clear) { $expoArgs += '--clear' }
  if ($Tunnel) { $expoArgs += '--tunnel' }

  & npx @expoArgs
} finally {
  Pop-Location
}

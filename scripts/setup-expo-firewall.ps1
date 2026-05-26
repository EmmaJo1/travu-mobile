param(
  [int]$Port = 8081
)

$ruleName = "Travu Expo Metro $Port"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  try {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
  } catch {
    Write-Error "방화벽 규칙 추가에 관리자 권한이 필요합니다. scripts/setup-firewall-admin.cmd 를 실행하세요."
    exit 1
  }
}

$profile = Get-NetConnectionProfile | Select-Object -First 1
if ($profile -and $profile.NetworkCategory -eq 'Public') {
  Set-NetConnectionProfile -InterfaceIndex $profile.InterfaceIndex -NetworkCategory Private
}

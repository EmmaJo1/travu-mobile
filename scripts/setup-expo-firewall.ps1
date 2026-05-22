param(
  [int]$Port = 8081
)

$ruleName = "Travu Expo Metro $Port"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
}

$profile = Get-NetConnectionProfile | Select-Object -First 1
if ($profile -and $profile.NetworkCategory -eq 'Public') {
  Set-NetConnectionProfile -InterfaceIndex $profile.InterfaceIndex -NetworkCategory Private
}

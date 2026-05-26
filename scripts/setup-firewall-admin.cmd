@echo off
echo Travu Expo - Windows 방화벽 규칙 추가 (관리자 권한 필요)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0setup-expo-firewall.ps1\" -Port 8081'"
echo.
echo UAC 창에서 [예]를 누르면 포트 8081 인바운드 규칙이 추가됩니다.
echo 완료 후 npm run start 로 다시 실행하세요.
pause

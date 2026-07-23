@echo off
cd /d C:\bthwani-suite-next
pwsh -NoProfile -ExecutionPolicy Bypass -File "tools\scripts\sentry\factory-reset.ps1" -ConfirmFullReset
pause

@echo off
setlocal enabledelayedexpansion
REM UAVHelpline weekly newsletter, launched by Windows Task Scheduler.
REM Triggers: weekly (Fri 16:00) AND at logon; the ISO-week guard below makes it
REM run AT MOST ONCE PER WEEK regardless of how many triggers fire.
cd /d "C:\Users\drone\OneDrive\Desktop\new_uavhelpline\uavhelpline-site"

for /f %%w in ('powershell -NoProfile -Command "Get-Date -UFormat %%Y-%%V"') do set "WEEK=%%w"
set "STAMP=scripts\last-weekly.txt"
set "LAST="
if exist "%STAMP%" set /p LAST=<"%STAMP%"
if "!LAST!"=="!WEEK!" (
  echo [%DATE% %TIME%] already ran week !WEEK! - skipping >> "scripts\weekly.log"
  exit /b 0
)

echo ==================== %DATE% %TIME% ==================== >> "scripts\weekly.log"
"C:\Program Files\nodejs\node.exe" --env-file-if-exists=.env.local scripts\weekly-newsletter.mjs >> "scripts\weekly.log" 2>&1
set "RC=!ERRORLEVEL!"
echo [exit !RC!] >> "scripts\weekly.log"
if "!RC!"=="0" echo !WEEK!>"%STAMP%"

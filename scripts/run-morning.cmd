@echo off
setlocal enabledelayedexpansion
REM UAVHelpline daily research+draft pipeline, launched by Windows Task Scheduler.
REM Triggers: daily at 10:00 AND at logon (so a missed day runs when the PC next
REM turns on). The date-guard below makes it run AT MOST ONCE PER DAY regardless
REM of how many triggers fire.
cd /d "C:\Users\drone\OneDrive\Desktop\new_uavhelpline\uavhelpline-site"

for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "TODAY=%%d"
set "STAMP=scripts\last-run.txt"
set "LAST="
if exist "%STAMP%" set /p LAST=<"%STAMP%"
if "!LAST!"=="!TODAY!" (
  echo [%DATE% %TIME%] already ran !TODAY! - skipping >> "scripts\morning.log"
  exit /b 0
)

echo ==================== %DATE% %TIME% ==================== >> "scripts\morning.log"
"C:\Program Files\nodejs\node.exe" --env-file-if-exists=.env.local scripts\morning-research.mjs >> "scripts\morning.log" 2>&1
set "RC=!ERRORLEVEL!"
echo [exit !RC!] >> "scripts\morning.log"
REM Only mark the day done on success, so a failed run retries on the next trigger.
if "!RC!"=="0" echo !TODAY!>"%STAMP%"

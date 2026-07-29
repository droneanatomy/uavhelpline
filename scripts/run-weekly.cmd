@echo off
setlocal enabledelayedexpansion
REM UAVHelpline weekly newsletter, launched by Windows Task Scheduler.
REM Triggers: weekly (Fri 16:00) AND at logon (catch-up if the PC was off).
REM
REM Guard: run at most once per week, anchored to FRIDAY. We skip if a run has
REM already happened on or after the most recent Friday. This is drift-free and
REM does NOT rely on week NUMBERS -- PowerShell's -UFormat %%V is not true ISO
REM (it rolled the week over mid-week), which previously let a Saturday run and
REM the next Wednesday both fire, only 4 days apart.
cd /d "C:\Users\drone\OneDrive\Desktop\new_uavhelpline\uavhelpline-site"

set "STAMP=scripts\last-weekly.txt"

REM Today's date (yyyy-MM-dd), written to the stamp on a successful run.
for /f "usebackq delims=" %%d in (`powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd')"`) do set "TODAY=%%d"

REM Gate: RUN unless the last successful run was already on/after this week's Friday.
for /f "usebackq delims=" %%g in (`powershell -NoProfile -Command "$s='%STAMP%'; $f=(Get-Date).Date; while($f.DayOfWeek -ne 'Friday'){$f=$f.AddDays(-1)}; if(Test-Path $s){try{$l=[datetime]::ParseExact((Get-Content $s -Raw).Trim(),'yyyy-MM-dd',$null)}catch{$l=[datetime]::MinValue}}else{$l=[datetime]::MinValue}; if($l -ge $f){'SKIP'}else{'RUN'}"`) do set "GATE=%%g"

if /i "!GATE!"=="SKIP" (
  echo [%DATE% %TIME%] already ran this week - skipping >> "scripts\weekly.log"
  exit /b 0
)

echo ==================== %DATE% %TIME% ==================== >> "scripts\weekly.log"
"C:\Program Files\nodejs\node.exe" --env-file-if-exists=.env.local scripts\weekly-newsletter.mjs >> "scripts\weekly.log" 2>&1
set "RC=!ERRORLEVEL!"
echo [exit !RC!] >> "scripts\weekly.log"
if "!RC!"=="0" echo !TODAY!>"%STAMP%"

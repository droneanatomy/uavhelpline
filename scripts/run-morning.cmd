@echo off
REM UAVHelpline daily research+draft pipeline, launched by Windows Task Scheduler.
REM Runs the same engine as `npm run morning`, writing a draft to Supabase.
cd /d "C:\Users\drone\OneDrive\Desktop\new_uavhelpline\uavhelpline-site"
echo ==================== %DATE% %TIME% ==================== >> "scripts\morning.log"
"C:\Program Files\nodejs\node.exe" --env-file-if-exists=.env.local scripts\morning-research.mjs >> "scripts\morning.log" 2>&1
echo [exit %ERRORLEVEL%] >> "scripts\morning.log"

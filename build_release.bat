@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "Path=%JAVA_HOME%\bin;%Path%"
cd android
echo Stopping Gradle Daemons...
call gradlew.bat --stop
echo Starting Production Build (Web Assets)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Web Build Failed with code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo Syncing with Capacitor...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo Capacitor Sync Failed with code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo Starting Android Release Build (Diagnostic)...
call gradlew.bat assembleRelease --no-daemon --stacktrace --info
if %ERRORLEVEL% NEQ 0 (
    echo Build Failed with code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
echo Build Succeeded!

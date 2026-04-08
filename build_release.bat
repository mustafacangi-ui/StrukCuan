@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "Path=%JAVA_HOME%\bin;%Path%"
cd android
echo Stopping Gradle Daemons...
call gradlew.bat --stop
echo Starting Release Build (Diagnostic)...
call gradlew.bat assembleRelease --no-daemon --stacktrace --info
if %ERRORLEVEL% NEQ 0 (
    echo Build Failed with code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
echo Build Succeeded!

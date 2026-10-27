@echo off
setlocal
cd /d "%~dp0"

set SDK=C:\Users\josha\AppData\Local\Android\Sdk
set ADB=%SDK%\platform-tools\adb.exe

if not exist "%ADB%" (echo ERROR: adb not found - install Android platform-tools. & exit /b 1)
if not exist AfrikaansLeer.apk (echo No APK yet - run build_apk.bat first. & exit /b 1)

echo Looking for your phone ...
echo (Plug it in with USB, then on the phone: Settings ^> About phone ^> tap "Build number" 7x
echo  ^> Developer options ^> enable "USB debugging" ^> allow the popup on first connect.)
echo.

"%ADB%" get-state >nul 2>&1
if errorlevel 1 (
  echo No phone detected. Enable USB debugging, plug in USB, then re-run this file.
  echo Or copy AfrikaansLeer.apk to the phone and tap it to install (see INSTALL.md).
  exit /b 1
)

"%ADB%" install -r AfrikaansLeer.apk
if errorlevel 1 (echo Install failed - check the message above.) else (echo DONE - "Afrikaans Leer" is on your phone!)

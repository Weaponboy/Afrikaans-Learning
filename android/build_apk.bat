@echo off
setlocal
cd /d "%~dp0"

set SDK=C:\Users\josha\AppData\Local\Android\Sdk
set BT=%SDK%\build-tools\35.0.0
set PLAT=%SDK%\platforms\android-35\android.jar
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%

if not exist "%BT%" (echo ERROR: build-tools 35.0.0 not found in %SDK% & exit /b 1)
if not exist "%PLAT%" (echo ERROR: android-35 platform not found in %SDK% & exit /b 1)

echo [1/6] Syncing web app into assets ...
if exist assets rmdir /s /q assets
mkdir assets
copy ..\index.html assets\ >nul || goto :err
copy ..\app.js assets\ >nul || goto :err
copy ..\data.js assets\ >nul || goto :err
copy ..\styles.css assets\ >nul || goto :err
copy ..\audio-manifest.js assets\ >nul || goto :err
robocopy ..\audio assets\audio /E /NJH /NJS /NDL /NFL >nul

if exist build rmdir /s /q build
mkdir build

echo [2/6] Compiling resources ...
"%BT%\aapt2.exe" compile --dir res -o build\res.zip || goto :err

echo [3/6] Linking resources + assets ...
"%BT%\aapt2.exe" link -o build\base.apk -I "%PLAT%" --manifest AndroidManifest.xml -A assets --java build\gen --min-sdk-version 24 --target-sdk-version 35 build\res.zip || goto :err

echo [4/6] Compiling Java ...
if not exist build\classes mkdir build\classes
"%JAVA_HOME%\bin\javac.exe" --release 11 -classpath "%PLAT%" -d build\classes build\gen\za\leer\afrikaansleer\R.java src\za\leer\afrikaansleer\MainActivity.java || goto :err

echo [5/6] Dexing + packing ...
call "%BT%\d8.bat" --release --lib "%PLAT%" --min-api 24 --output build build\classes\za\leer\afrikaansleer\*.class || goto :err
python pack_dex.py build\base.apk build\classes.dex || goto :err

echo [6/6] Aligning + signing ...
"%BT%\zipalign.exe" -f -p 4 build\base.apk build\aligned.apk || goto :err
if not exist debug.keystore "%JAVA_HOME%\bin\keytool.exe" -genkeypair -keystore debug.keystore -storepass android -keypass android -alias afk -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Afrikaans Leer" || goto :err
call "%BT%\apksigner.bat" sign --ks debug.keystore --ks-pass pass:android --ks-key-alias afk --out AfrikaansLeer.apk build\aligned.apk || goto :err
call "%BT%\apksigner.bat" verify AfrikaansLeer.apk || goto :err

echo.
echo BUILD OK: android\AfrikaansLeer.apk
exit /b 0

:err
echo BUILD FAILED
exit /b 1

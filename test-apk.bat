@echo off
REM Habit Tracker APK Testing Script for Windows
REM This script helps verify that the Habit Tracker APK is working correctly

echo === Habit Tracker APK Testing Script ===
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    exit /b 1
)

echo ✅ Found project root

REM Check if node_modules exists
if not exist "node_modules" (
    echo ⚠️  Warning: node_modules not found. Running 'npm install'...
    call npm install
)

echo ✅ Dependencies installed

REM Check if assets exist
if not exist "assets" (
    echo ❌ Error: assets directory not found
    exit /b 1
)

echo ✅ Assets directory found

REM Check for required sound files
echo Checking sound files...
if not exist "assets\sounds\alarm.mp3" (
    echo ❌ Error: Required sound file not found: assets\sounds\alarm.mp3
    exit /b 1
)

if not exist "assets\sounds\notification.mp3" (
    echo ❌ Error: Required sound file not found: assets\sounds\notification.mp3
    exit /b 1
)

echo ✅ All required sound files found

REM Check if app.json has required permissions
echo Checking app.json permissions...
findstr /C:"SCHEDULE_EXACT_ALARM" app.json >nul
if %errorlevel% neq 0 (
    echo ❌ Error: SCHEDULE_EXACT_ALARM permission not found in app.json
    exit /b 1
)

findstr /C:"RECEIVE_BOOT_COMPLETED" app.json >nul
if %errorlevel% neq 0 (
    echo ❌ Error: RECEIVE_BOOT_COMPLETED permission not found in app.json
    exit /b 1
)

findstr /C:"WAKE_LOCK" app.json >nul
if %errorlevel% neq 0 (
    echo ❌ Error: WAKE_LOCK permission not found in app.json
    exit /b 1
)

findstr /C:"VIBRATE" app.json >nul
if %errorlevel% neq 0 (
    echo ❌ Error: VIBRATE permission not found in app.json
    exit /b 1
)

echo ✅ All required Android permissions found in app.json

REM Check if eas.json exists
if exist "eas.json" (
    echo ✅ EAS configuration found
    findstr /C:"buildType.*apk" eas.json >nul
    if %errorlevel% equ 0 (
        echo ✅ APK build configuration found
    ) else (
        echo ⚠️  Warning: APK build configuration not found in eas.json
    )
) else (
    echo ⚠️  Warning: eas.json not found
)

REM Check for TypeScript errors
echo.
echo === TypeScript Check ===
call npx tsc --noEmit --skipLibCheck
if %errorlevel% neq 0 (
    echo ❌ TypeScript compilation failed
    exit /b 1
)

echo ✅ TypeScript compilation successful

REM Check for linting issues (if available)
echo.
echo === Linting Check ===
where npx eslint >nul 2>nul
if %errorlevel% equ 0 (
    call npx eslint client/ --ext .ts,.tsx --max-warnings 0
    if %errorlevel% equ 0 (
        echo ✅ ESLint check passed
    ) else (
        echo ⚠️  ESLint found issues (warnings allowed)
    )
) else (
    echo ⚠️  ESLint not available
)

REM Check if we can build the app
echo.
echo === Build Test ===
call npx expo export --platform android --output-dir build-test
if %errorlevel% neq 0 (
    echo ❌ Expo export failed
    exit /b 1
)

echo ✅ Expo export successful
rmdir /s /q build-test >nul 2>nul

echo.
echo === All Tests Passed! ===
echo ✅ Habit Tracker APK is ready for building
echo.
echo Next steps:
echo 1. Run 'eas build --platform android --profile development' for development APK
echo 2. Run 'eas build --platform android --profile preview' for preview APK
echo 3. Run 'eas build --platform android --profile production' for production build
echo.
echo 🎉 Habit Tracker APK testing complete!
pause

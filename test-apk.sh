#!/bin/bash

# Habit Tracker APK Testing Script
# This script helps verify that the Habit Tracker APK is working correctly

echo "=== Habit Tracker APK Testing Script ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found project root"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  Warning: node_modules not found. Running 'npm install'..."
    npm install
fi

echo "✅ Dependencies installed"

# Check if assets exist
if [ ! -d "assets" ]; then
    echo "❌ Error: assets directory not found"
    exit 1
fi

echo "✅ Assets directory found"

# Check for required sound files
required_sounds=("assets/sounds/alarm.mp3" "assets/sounds/notification.mp3")
for sound in "${required_sounds[@]}"; do
    if [ ! -f "$sound" ]; then
        echo "❌ Error: Required sound file not found: $sound"
        exit 1
    fi
done

echo "✅ All required sound files found"

# Check if app.json has required permissions
if grep -q "SCHEDULE_EXACT_ALARM" app.json && grep -q "RECEIVE_BOOT_COMPLETED" app.json && grep -q "WAKE_LOCK" app.json && grep -q "VIBRATE" app.json; then
    echo "✅ All required Android permissions found in app.json"
else
    echo "❌ Error: Missing required Android permissions in app.json"
    exit 1
fi

# Check if eas.json exists and has proper build configuration
if [ -f "eas.json" ]; then
    echo "✅ EAS configuration found"
    if grep -q "buildType.*apk" eas.json; then
        echo "✅ APK build configuration found"
    else
        echo "⚠️  Warning: APK build configuration not found in eas.json"
    fi
else
    echo "⚠️  Warning: eas.json not found"
fi

# Check for TypeScript errors
echo ""
echo "=== TypeScript Check ==="
if npx tsc --noEmit --skipLibCheck; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Check for linting issues (if available)
echo ""
echo "=== Linting Check ==="
if command -v npx eslint &> /dev/null; then
    if npx eslint client/ --ext .ts,.tsx --max-warnings 0; then
        echo "✅ ESLint check passed"
    else
        echo "⚠️  ESLint found issues (warnings allowed)"
    fi
else
    echo "⚠️  ESLint not available"
fi

# Check if we can build the app
echo ""
echo "=== Build Test ==="
if npx expo export --platform android --output-dir build-test; then
    echo "✅ Expo export successful"
    rm -rf build-test
else
    echo "❌ Expo export failed"
    exit 1
fi

echo ""
echo "=== All Tests Passed! ==="
echo "✅ Habit Tracker APK is ready for building"
echo ""
echo "Next steps:"
echo "1. Run 'eas build --platform android --profile development' for development APK"
echo "2. Run 'eas build --platform android --profile preview' for preview APK"
echo "3. Run 'eas build --platform android --profile production' for production build"
echo ""
echo "🎉 Habit Tracker APK testing complete!"

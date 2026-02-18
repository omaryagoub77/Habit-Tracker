# EAS APK Build Script for Windows
# Kills Node.js processes, cleans temp folder, and builds APK

param(
    [switch]$SkipNodeKill = $false,
    [switch]$AlreadyElevated = $false
)

# Check if running as Administrator and re-launch if needed
if (-not $AlreadyElevated) {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    if (-not $isAdmin) {
        Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
        $scriptPath = $MyInvocation.MyCommand.Path
        $scriptArguments = "-NoExit -ExecutionPolicy Bypass -File `"$scriptPath`" -AlreadyElevated"
        if ($SkipNodeKill) {
            $scriptArguments += " -SkipNodeKill"
        }
        try {
            Start-Process PowerShell -Verb RunAs -ArgumentList $scriptArguments
            exit 0
        }
        catch {
            Write-Host "Failed to elevate privileges. Please run PowerShell as Administrator manually." -ForegroundColor Red
            exit 1
        }
    }
}

# Set error action preference for better error handling
$ErrorActionPreference = "Continue"

Write-Host "=== EAS APK Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if ($isAdmin) {
    Write-Host "Running with Administrator privileges ✓" -ForegroundColor Green
}
else {
    Write-Host "⚠ Note: Running without Administrator privileges. Some cleanup operations may fail." -ForegroundColor Yellow
}

Write-Host ""

# Step 1: Kill all Node.js processes
if (-not $SkipNodeKill) {
    Write-Host "Step 1: Killing Node.js processes..." -ForegroundColor Yellow
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
            # Wait for processes to fully terminate
            Start-Sleep -Milliseconds 500
            Write-Host "✓ Node.js processes terminated." -ForegroundColor Green
        }
        else {
            Write-Host "✓ No Node.js processes found." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠ Warning: Could not kill Node.js processes: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
else {
    Write-Host "Step 1: Skipping Node.js process termination (--SkipNodeKill used)" -ForegroundColor Gray
}

Write-Host ""

# Step 2: Delete eas-cli-nodejs folder from Temp directory
Write-Host "Step 2: Cleaning eas-cli-nodejs from Temp folder..." -ForegroundColor Yellow
try {
    $tempPath = [System.IO.Path]::GetTempPath()
    $easCliNodePath = Join-Path $tempPath "eas-cli-nodejs"
    
    if (Test-Path -Path $easCliNodePath) {
        Write-Host "  Found eas-cli-nodejs folder, attempting cleanup..." -ForegroundColor Gray
        
        # Strategy 1: Remove .expo folders (known source of issues)
        try {
            $expoFolders = Get-ChildItem -Path $easCliNodePath -Filter ".expo" -Recurse -Force -ErrorAction SilentlyContinue
            $expoCount = @($expoFolders).Count
            if ($expoCount -gt 0) {
                Write-Host "  Found $expoCount .expo directories" -ForegroundColor Gray
                foreach ($folder in $expoFolders) {
                    try {
                        # Reset all attributes recursively
                        $folder.Attributes = [System.IO.FileAttributes]::Normal
                        Get-ChildItem -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue | 
                            ForEach-Object { 
                                $_.Attributes = [System.IO.FileAttributes]::Normal 
                            }
                        Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction Stop
                    }
                    catch {
                        # Log but continue
                        Write-Host "    ⚠ Could not remove $($folder.FullName): $($_.Exception.Message)" -ForegroundColor DarkYellow
                    }
                }
            }
        }
        catch {
            # Continue if .expo cleanup fails
        }

        # Strategy 2: Use cmd.exe for stubborn directories
        try {
            cmd.exe /c "cd /d `"$easCliNodePath`" && cd .. && timeout /t 1 /nobreak >nul 2>&1 && for /d %A in (`"$easCliNodePath\*`") do @rmdir /s /q `"%A`" 2>nul || taskkill /f /im node.exe 2>nul" 2>$null
        }
        catch {
            # Continue if cmd method fails
        }

        # Strategy 3: Remove all remaining attributes and retry full removal
        try {
            Get-ChildItem -Path $easCliNodePath -Recurse -Force -ErrorAction SilentlyContinue | 
                ForEach-Object {
                    try {
                        $_.Attributes = [System.IO.FileAttributes]::Normal
                    }
                    catch {}
                }
            Remove-Item -Path $easCliNodePath -Recurse -Force -ErrorAction Stop
        }
        catch {
            # Continue if PowerShell removal fails
        }

        # Final verification
        if (-not (Test-Path -Path $easCliNodePath)) {
            Write-Host "✓ eas-cli-nodejs folder cleaned successfully." -ForegroundColor Green
        }
        else {
            Write-Host "⚠ Warning: Could not fully remove eas-cli-nodejs folder." -ForegroundColor Yellow
            Write-Host "  The folder will be cleaned by EAS during build." -ForegroundColor Gray
        }
    }
    else {
        Write-Host "✓ eas-cli-nodejs folder does not exist (no action needed)." -ForegroundColor Green
    }
}
catch {
    Write-Host "✓ eas-cli-nodejs folder does not exist or could not be accessed (continuing)." -ForegroundColor Green
}

Write-Host ""

# Step 3: Change to project directory (script's directory)
Write-Host "Step 3: Changing to project directory..." -ForegroundColor Yellow
try {
    $projectPath = Split-Path -Parent -Path $MyInvocation.MyCommand.Path
    Set-Location -Path $projectPath
    Write-Host "✓ Changed to: $(Get-Location)" -ForegroundColor Green
}
catch {
    Write-Host "✗ Error: Could not change directory: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Run EAS Build command
Write-Host "Step 4: Building APK with EAS..." -ForegroundColor Yellow
Write-Host "Running: eas build -p android --profile production-apk" -ForegroundColor Cyan
Write-Host ""

# Add a small delay to ensure cleanup is fully complete
Start-Sleep -Milliseconds 1000

try {
    & eas build -p android --profile production-apk
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ APK build completed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "✗ APK build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting suggestions:" -ForegroundColor Yellow
        Write-Host "1. Run the script with Administrator privileges" -ForegroundColor Gray
        Write-Host "2. Check if antivirus is interfering (temporarily disable it)" -ForegroundColor Gray
        Write-Host "3. Manually delete: $tempPath\eas-cli-nodejs" -ForegroundColor Gray
        Write-Host "4. Try setting the environment variable: `$env:EAS_NO_CACHE=1" -ForegroundColor Gray
        Write-Host "5. Clear npm cache: npm cache clean --force" -ForegroundColor Gray
        exit $LASTEXITCODE
    }
}
catch {
    Write-Host "✗ Error: Failed to run EAS build: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Build Script Complete ===" -ForegroundColor Cyan

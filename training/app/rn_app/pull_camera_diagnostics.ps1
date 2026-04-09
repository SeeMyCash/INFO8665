param(
    [string]$Package = "com.femil.seemycash",
    [string]$OutputDir = "outputs/mobile_probe"
)

$ErrorActionPreference = "Stop"

function Resolve-AdbPath {
    $adbOnPath = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbOnPath) {
        return $adbOnPath.Source
    }

    $fallbacks = @(
        "C:\Users\femil\AppData\Local\Android\Sdk\platform-tools\adb.exe",
        "C:\Android\sdk\platform-tools\adb.exe"
    )
    foreach ($candidate in $fallbacks) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "adb not found. Install Android platform-tools or add adb to PATH."
}

function Read-LogFileFromDevice {
    param(
        [string]$AdbPath,
        [string]$PackageName,
        [string]$RemotePath
    )

    return & $AdbPath shell run-as $PackageName cat $RemotePath
}

function Write-LogcatFallback {
    param(
        [string]$AdbPath,
        [string]$OutputDirectory,
        [string]$Timestamp
    )

    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
    $localPath = Join-Path $OutputDirectory ("camera-logcat-{0}.log" -f $Timestamp)
    $raw = & $AdbPath logcat -d -v time ReactNativeJS:I ReactNative:W CameraX:W Camera2:W AndroidRuntime:E *:S
    $filtered = @($raw) | Where-Object {
        $_ -match "\[camera\]" `
            -or $_ -match "ERR_IMAGE_CAPTURE_FAILED" `
            -or $_ -match "Failed to capture image" `
            -or $_ -match "Network request failed" `
            -or $_ -match "Backend unreachable"
    }

    if (-not $filtered -or $filtered.Count -eq 0) {
        $filtered = @("No camera-specific logcat entries matched the fallback filter.")
    }

    [System.IO.File]::WriteAllText($localPath, ($filtered -join "`n"), [System.Text.UTF8Encoding]::new($false))
    return (Resolve-Path $localPath).Path
}

$adb = Resolve-AdbPath
& $adb start-server | Out-Null

$deviceList = & $adb devices
if (($deviceList | Select-String -Pattern "device$").Count -eq 0) {
    throw "No Android device detected via adb."
}

$fileCandidates = @()
try {
    $foundFiles = & $adb shell run-as $Package find files -type f 2>&1
    if ($LASTEXITCODE -eq 0) {
        $fileCandidates += $foundFiles
    }
} catch {
    # Fallback handled below (logcat) for non-debuggable or inaccessible packages.
}

try {
    $foundCache = & $adb shell run-as $Package find cache -type f 2>&1
    if ($LASTEXITCODE -eq 0) {
        $fileCandidates += $foundCache
    }
} catch {
    # Fallback handled below.
}

$paths = @(
    @($fileCandidates) |
        ForEach-Object { "$_".Trim() } |
        Where-Object { $_ -and $_ -notmatch "^run-as:" -and $_ -match "camera-diagnostics\.log$" } |
        Select-Object -Unique
)

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$written = @()
if ($paths -and $paths.Count -gt 0) {
    for ($i = 0; $i -lt $paths.Count; $i++) {
        $remotePath = $paths[$i]
        $content = Read-LogFileFromDevice -AdbPath $adb -PackageName $Package -RemotePath $remotePath
        $localPath = Join-Path $OutputDir ("camera-diagnostics-{0}-{1}.log" -f $timestamp, $i)
        [System.IO.File]::WriteAllText($localPath, ($content -join "`n"), [System.Text.UTF8Encoding]::new($false))
        $written += [PSCustomObject]@{
            Remote = $remotePath
            Local = (Resolve-Path $localPath).Path
        }
    }
} else {
    $fallbackPath = Write-LogcatFallback -AdbPath $adb -OutputDirectory $OutputDir -Timestamp $timestamp
    $written += [PSCustomObject]@{
        Remote = "logcat:fallback"
        Local = $fallbackPath
    }
}

Write-Output "Camera diagnostics pulled successfully:"
$written | ForEach-Object { Write-Output ("- {0} -> {1}" -f $_.Remote, $_.Local) }

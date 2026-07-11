param(
    [string]$Version = "22.19.0"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeDirectory = Join-Path $projectRoot "resources\node"
$nodeExecutable = Join-Path $nodeDirectory "node.exe"
$expectedVersion = "v$Version"

if (Test-Path -LiteralPath $nodeExecutable) {
    $installedVersion = & $nodeExecutable --version
    if ($LASTEXITCODE -eq 0 -and $installedVersion.Trim() -eq $expectedVersion) {
        Write-Host "Bundled Node.js $expectedVersion is ready."
        exit 0
    }
}

$downloadRoot = Join-Path $projectRoot ".node-download"
$archivePath = Join-Path $downloadRoot "node-v$Version-win-x64.zip"
$extractPath = Join-Path $downloadRoot "extract"
$downloadUrl = "https://nodejs.org/dist/v$Version/node-v$Version-win-x64.zip"

if (Test-Path -LiteralPath $downloadRoot) {
    Remove-Item -LiteralPath $downloadRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $downloadRoot | Out-Null
New-Item -ItemType Directory -Path $nodeDirectory -Force | Out-Null

try {
    Write-Host "Downloading Node.js $expectedVersion..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
    Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath

    $downloadedNode = Join-Path $extractPath "node-v$Version-win-x64\node.exe"
    if (-not (Test-Path -LiteralPath $downloadedNode)) {
        throw "Downloaded Node.js executable was not found: $downloadedNode"
    }

    Copy-Item -LiteralPath $downloadedNode -Destination $nodeExecutable -Force
    $installedVersion = & $nodeExecutable --version
    if ($LASTEXITCODE -ne 0 -or $installedVersion.Trim() -ne $expectedVersion) {
        throw "Bundled Node.js verification failed. Expected $expectedVersion, got $installedVersion"
    }

    Write-Host "Bundled Node.js $expectedVersion installed at $nodeExecutable"
}
finally {
    if (Test-Path -LiteralPath $downloadRoot) {
        Remove-Item -LiteralPath $downloadRoot -Recurse -Force
    }
}

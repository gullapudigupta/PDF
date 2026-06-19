param(
  [string]$ProjectDir = "D:\test\copilot\pdf-git2\pdf-viewer-editor",
  [string]$LogFile = "D:\test\copilot\pdf-git2\pdf-viewer-editor\install-for-tests.log"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ProjectDir)) {
  Write-Error "Project directory not found: $ProjectDir"
  exit 2
}

if (Test-Path $LogFile) {
  try {
    Clear-Content $LogFile -ErrorAction Stop
  }
  catch {
    $stamp = Get-Date -Format 'yyyyMMddHHmmss'
    $LogFile = [System.IO.Path]::Combine($ProjectDir, "install-for-tests-$stamp.log")
  }
}

$env:PNPM_FETCH_TIMEOUT = '600000'
$env:PNPM_FETCH_RETRIES = '8'
$env:PNPM_FETCH_RETRY_FACTOR = '2'
$env:PNPM_STORE_DIR = Join-Path $ProjectDir '.pnpm-store'
$env:ELECTRON_SKIP_BINARY_DOWNLOAD = '1'
$env:ELECTRON_BUILDER_SKIP_DOWNLOAD = 'true'

Write-Output "[install] project=$ProjectDir" | Tee-Object -FilePath $LogFile -Append
Write-Output "[install] store=$($env:PNPM_STORE_DIR)" | Tee-Object -FilePath $LogFile -Append
Write-Output "[install] started=$(Get-Date -Format o)" | Tee-Object -FilePath $LogFile -Append

Push-Location $ProjectDir
try {
  corepack pnpm config set store-dir $env:PNPM_STORE_DIR
  corepack pnpm config set ignore-scripts true
  corepack pnpm config set strict-dep-builds false

  # Install test/runtime deps while skipping optional heavy artifacts and lifecycle scripts.
  corepack pnpm install --prod=false --no-optional --ignore-scripts --reporter=append-only 2>&1 |
    Tee-Object -FilePath $LogFile -Append

  $installExit = $LASTEXITCODE
  if ($installExit -ne 0) {
    Write-Output "[install] exit_code=$installExit" | Tee-Object -FilePath $LogFile -Append
    exit $installExit
  }

  $required = @(
    'node_modules/@angular-devkit/build-angular',
    'node_modules/@angular/cli',
    'node_modules/typescript',
    'node_modules/karma',
    'node_modules/karma-chrome-launcher'
  )

  $missing = @()
  foreach ($path in $required) {
    if (-not (Test-Path (Join-Path $ProjectDir $path))) {
      $missing += $path
    }
  }

  if ($missing.Count -gt 0) {
    Write-Output "[install] missing_dependencies=$($missing -join ',')" | Tee-Object -FilePath $LogFile -Append
    exit 3
  }

  Write-Output "[install] verified_required_dependencies=true" | Tee-Object -FilePath $LogFile -Append
  Write-Output "[install] exit_code=0" | Tee-Object -FilePath $LogFile -Append
}
finally {
  Pop-Location
}

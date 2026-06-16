param(
  [string]$ProjectDir = "D:\test\copilot\pdf-git2\pdf-viewer-editor",
  [string]$LogFile = "D:\test\copilot\pdf-git2\pdf-viewer-editor\test-run.log"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ProjectDir)) {
  Write-Error "Project directory not found: $ProjectDir"
  exit 2
}

if (Test-Path $LogFile) {
  Remove-Item $LogFile -Force
}

Write-Output "[test:logged] project=$ProjectDir" | Tee-Object -FilePath $LogFile -Append
Write-Output "[test:logged] started=$(Get-Date -Format o)" | Tee-Object -FilePath $LogFile -Append

Push-Location $ProjectDir
try {
  # Keep output in UTF-8 and mirror everything to file for reliable retrieval.
  corepack pnpm --dir $ProjectDir ng test --watch=false --browsers=ChromeHeadless --progress=false --code-coverage 2>&1 |
    Tee-Object -FilePath $LogFile -Append

  $exitCode = $LASTEXITCODE
}
finally {
  Pop-Location
}

# Parse a standard Karma summary like: TOTAL: 23 SUCCESS
$raw = Get-Content -Path $LogFile -Raw
$summaryMatches = [regex]::Matches($raw, 'TOTAL:\s*(\d+)\s+SUCCESS', 'IgnoreCase')

if ($summaryMatches.Count -gt 0) {
  $last = $summaryMatches[$summaryMatches.Count - 1]
  $total = $last.Groups[1].Value
  Write-Output "[test:logged] summary=TOTAL:$total SUCCESS" | Tee-Object -FilePath $LogFile -Append
} else {
  Write-Output "[test:logged] summary=No Karma TOTAL line found" | Tee-Object -FilePath $LogFile -Append
}

Write-Output "[test:logged] exit_code=$exitCode" | Tee-Object -FilePath $LogFile -Append
exit $exitCode

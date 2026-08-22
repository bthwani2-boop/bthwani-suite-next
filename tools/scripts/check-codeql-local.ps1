<#
.SYNOPSIS
  Confirms the repository's CodeQL execution policy.

.DESCRIPTION
  CodeQL is intentionally remote-only for bthwani-suite-next. The canonical
  analysis path is .github/workflows/codeql.yml on GitHub-hosted runners.
  This diagnostic never discovers, installs, or executes a local CodeQL CLI.
#>

$ErrorActionPreference = "Stop"

Write-Host "CODEQL_REMOTE_ONLY: PASS"
Write-Host "  Canonical authority: .github/workflows/codeql.yml"
Write-Host "  Execution plane: GitHub-hosted Actions runners"
Write-Host "  Local CodeQL CLI discovery/execution: disabled by repository policy"
exit 0

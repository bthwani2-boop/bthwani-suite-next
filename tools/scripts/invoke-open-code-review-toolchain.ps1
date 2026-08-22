[CmdletBinding()]
param(
  [ValidateSet("Setup", "Repair", "Version", "Verify", "DelegatePreview", "DelegateRules", "DelegateAudit", "Full")]
  [string]$Mode = "Setup",

  [string[]]$Path = @(),

  [string]$From = "",

  [string]$To = "HEAD",

  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedVersion = "1.9.9"
$PackageName = "@alibaba-group/open-code-review"
$RulePath = ".opencodereview/rule.json"
$PackagePath = "package.json"
$ScriptPath = "tools/scripts/invoke-open-code-review-toolchain.ps1"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path

function Invoke-ExternalCommand {
  param(
    [Parameter(Mandatory)]
    [string]$FilePath,

    [string[]]$Arguments = @(),

    [switch]$Capture
  )

  if ($Capture) {
    $output = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()
    if ($exitCode -ne 0) {
      throw "Command failed ($exitCode): $FilePath $($Arguments -join ' ')`n$text"
    }
    return $text
  }

  & $FilePath @Arguments 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
  }
}

function Write-Utf8Json {
  param(
    [Parameter(Mandatory)]
    [string]$LiteralPath,

    [Parameter(Mandatory)]
    [object]$Value
  )

  $json = $Value | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText(
    (Join-Path $Root $LiteralPath),
    $json + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Get-RequiredExclusions {
  return @(
    "**/node_modules/**",
    "**/vendor/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/.expo/**",
    "**/coverage/**",
    "**/clients/generated/**",
    "**/generated/**",
    "**/*.min.js",
    "**/*.map",
    "pnpm-lock.yaml",
    "**/graphify-out/**",
    "**/.diagnostics/**",
    "**/.nx/**",
    "**/.pnpm-store/**",
    "**/.cache/**",
    "**/.turbo/**",
    "**/.yagni-out/**",
    "**/.artifacts/**",
    "**/*.log",
    "**/*.bak",
    "**/*.graphify-bak"
  )
}

function Get-DesiredPackageScripts {
  return [ordered]@{
    "ocr:setup" = "pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode Setup"
    "ocr:version" = "pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode Version"
    "ocr:preview" = "pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode DelegatePreview"
    "ocr:rules" = "pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode DelegateRules"
    "ocr:audit" = "pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode DelegateAudit"
    "ocr:verify" = "pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode Verify"
    "ocr:full" = "pwsh -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode Full"
  }
}

function Set-ObjectProperty {
  param(
    [Parameter(Mandatory)]
    [object]$Object,

    [Parameter(Mandatory)]
    [string]$Name,

    [Parameter(Mandatory)]
    [object]$Value
  )

  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
  }
  else {
    $property.Value = $Value
  }
}

function Get-OcrCommand {
  param([switch]$AllowInstall)

  $command = Get-Command ocr -ErrorAction SilentlyContinue
  $version = ""
  if ($null -ne $command) {
    $version = Invoke-ExternalCommand -FilePath $command.Source -Arguments @("--version") -Capture
  }

  if (($null -eq $command) -or ($version -notmatch "(^|[^0-9])$([regex]::Escape($ExpectedVersion))([^0-9]|$)")) {
    if (-not $AllowInstall) {
      $actual = if ($null -eq $command) { "not installed" } else { $version }
      throw "OpenCodeReview $ExpectedVersion is required; current state: $actual. Run: pnpm run ocr:setup"
    }

    if ($SkipInstall) {
      throw "OpenCodeReview installation is required, but -SkipInstall was supplied."
    }

    $npm = Get-Command npm -ErrorAction Stop
    Invoke-ExternalCommand -FilePath $npm.Source -Arguments @(
      "install",
      "--global",
      "${PackageName}@${ExpectedVersion}"
    )

    $command = Get-Command ocr -ErrorAction Stop
    $version = Invoke-ExternalCommand -FilePath $command.Source -Arguments @("--version") -Capture
    if ($version -notmatch "(^|[^0-9])$([regex]::Escape($ExpectedVersion))([^0-9]|$)") {
      throw "OpenCodeReview installation completed but version verification failed. Expected $ExpectedVersion, got: $version"
    }
  }

  return [pscustomobject]@{
    Command = $command
    Version = $version
  }
}

function Set-OpenCodeReviewConfiguration {
  $changed = [System.Collections.Generic.List[string]]::new()

  $package = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json
  if ($null -eq $package.scripts) {
    $package | Add-Member -NotePropertyName scripts -NotePropertyValue ([pscustomobject]@{})
  }

  $desiredScripts = Get-DesiredPackageScripts
  $packageChanged = $false
  foreach ($entry in $desiredScripts.GetEnumerator()) {
    $existing = $package.scripts.PSObject.Properties[$entry.Key]
    if (($null -eq $existing) -or ([string]$existing.Value -ne [string]$entry.Value)) {
      Set-ObjectProperty -Object $package.scripts -Name $entry.Key -Value $entry.Value
      $packageChanged = $true
    }
  }

  if ($packageChanged) {
    Write-Utf8Json -LiteralPath $PackagePath -Value $package
    $changed.Add($PackagePath)
  }

  $rule = Get-Content -LiteralPath $RulePath -Raw | ConvertFrom-Json
  $ruleChanged = $false

  if ($null -ne $rule.PSObject.Properties["include"]) {
    $rule.PSObject.Properties.Remove("include")
    $ruleChanged = $true
  }

  $exclusions = [System.Collections.Generic.List[string]]::new()
  if ($null -ne $rule.PSObject.Properties["exclude"]) {
    foreach ($item in @($rule.exclude)) {
      $value = [string]$item
      if (-not [string]::IsNullOrWhiteSpace($value) -and -not $exclusions.Contains($value)) {
        $exclusions.Add($value)
      }
    }
  }

  foreach ($required in Get-RequiredExclusions) {
    if (-not $exclusions.Contains($required)) {
      $exclusions.Add($required)
      $ruleChanged = $true
    }
  }

  if ($null -eq $rule.PSObject.Properties["exclude"]) {
    $rule | Add-Member -NotePropertyName exclude -NotePropertyValue @($exclusions)
    $ruleChanged = $true
  }
  else {
    $rule.exclude = @($exclusions)
  }

  if (($null -eq $rule.PSObject.Properties["rules"]) -or @($rule.rules).Count -eq 0) {
    throw "OpenCodeReview rules are missing from $RulePath."
  }

  foreach ($entry in @($rule.rules)) {
    $mergeProperty = $entry.PSObject.Properties["merge_system_rule"]
    if ($null -eq $mergeProperty) {
      $entry | Add-Member -NotePropertyName merge_system_rule -NotePropertyValue $true
      $ruleChanged = $true
    }
    elseif ($entry.merge_system_rule -ne $true) {
      $entry.merge_system_rule = $true
      $ruleChanged = $true
    }
  }

  if ($ruleChanged) {
    Write-Utf8Json -LiteralPath $RulePath -Value $rule
    $changed.Add($RulePath)
  }

  return @($changed)
}

function Get-ReviewTargets {
  $targets = [System.Collections.Generic.List[string]]::new()

  if (@($Path).Count -gt 0) {
    foreach ($candidate in @($Path)) {
      if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $targets.Add($candidate.Replace("\\", "/"))
      }
    }
  }
  elseif (-not [string]::IsNullOrWhiteSpace($From)) {
    $git = (Get-Command git -ErrorAction Stop).Source
    $range = "${From}...${To}"
    $output = Invoke-ExternalCommand -FilePath $git -Arguments @(
      "diff",
      "--name-only",
      "--diff-filter=ACMRTUXB",
      $range
    ) -Capture

    foreach ($line in ($output -split "`r?`n")) {
      if (-not [string]::IsNullOrWhiteSpace($line)) {
        $targets.Add($line.Trim().Replace("\\", "/"))
      }
    }
  }
  else {
    $git = (Get-Command git -ErrorAction Stop).Source
    $commands = [System.Collections.Generic.List[object]]::new()
    $commands.Add([string[]]@("diff", "--name-only", "--diff-filter=ACMRTUXB"))
    $commands.Add([string[]]@("diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"))
    $commands.Add([string[]]@("ls-files", "--others", "--exclude-standard"))

    foreach ($arguments in $commands) {
      $output = Invoke-ExternalCommand -FilePath $git -Arguments ([string[]]$arguments) -Capture
      foreach ($line in ($output -split "`r?`n")) {
        if (-not [string]::IsNullOrWhiteSpace($line)) {
          $targets.Add($line.Trim().Replace("\\", "/"))
        }
      }
    }
  }

  $unique = [System.Collections.Generic.List[string]]::new()
  foreach ($target in $targets) {
    if ((Test-Path -LiteralPath $target -PathType Leaf) -and -not $unique.Contains($target)) {
      $unique.Add($target)
    }
  }

  return @($unique)
}

function Invoke-DelegatePreview {
  param([Parameter(Mandatory)][object]$Ocr)

  $arguments = @(
    "delegate",
    "preview",
    "--rule",
    $RulePath
  )

  if (-not [string]::IsNullOrWhiteSpace($From)) {
    $arguments += @(
      "--from",
      $From,
      "--to",
      $To
    )
  }

  Invoke-ExternalCommand -FilePath $Ocr.Command.Source -Arguments $arguments
}

function Invoke-DelegateRules {
  param([Parameter(Mandatory)][object]$Ocr)

  $targets = Get-ReviewTargets
  if ($targets.Count -eq 0) {
    throw "No reviewable changed files were found. Supply -Path or -From/-To."
  }

  Invoke-ExternalCommand -FilePath $Ocr.Command.Source -Arguments (@(
    "delegate",
    "rule",
    "--rule",
    $RulePath
  ) + $targets)

  Write-Output "review_target_count=$($targets.Count)"
}

function Invoke-DelegateAudit {
  param([Parameter(Mandatory)][object]$Ocr)

  $targets = Get-ReviewTargets
  if ($targets.Count -eq 0) {
    throw "No reviewable changed files were found. Supply -Path or -From/-To."
  }

  Write-Output "=== OCR DELEGATION PREVIEW ==="
  Invoke-DelegatePreview -Ocr $Ocr

  Write-Output "=== OCR RESOLVED RULES ==="
  Invoke-ExternalCommand -FilePath $Ocr.Command.Source -Arguments (@(
    "delegate",
    "rule",
    "--rule",
    $RulePath
  ) + $targets)

  Write-Output "=== REVIEW TARGETS ==="
  $targets | ForEach-Object { Write-Output $_ }

  Write-Output "=== GIT DIFF ==="
  $git = (Get-Command git -ErrorAction Stop).Source
  if (-not [string]::IsNullOrWhiteSpace($From)) {
    Invoke-ExternalCommand -FilePath $git -Arguments @(
      "diff",
      "--no-ext-diff",
      "--unified=80",
      "${From}...${To}"
    )
  }
  else {
    Invoke-ExternalCommand -FilePath $git -Arguments @(
      "diff",
      "--no-ext-diff",
      "--unified=80"
    )
    Invoke-ExternalCommand -FilePath $git -Arguments @(
      "diff",
      "--cached",
      "--no-ext-diff",
      "--unified=80"
    )
  }

  Write-Output "delegation_contract=HOST_AGENT_MUST_REVIEW_DIFF_WITH_RESOLVED_RULES"
  Write-Output "review_target_count=$($targets.Count)"
}

function Test-OpenCodeReviewConfiguration {
  param([Parameter(Mandatory)][object]$Ocr)

  $package = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json
  $desiredScripts = Get-DesiredPackageScripts
  foreach ($entry in $desiredScripts.GetEnumerator()) {
    $actual = $package.scripts.PSObject.Properties[$entry.Key]
    if (($null -eq $actual) -or ([string]$actual.Value -ne [string]$entry.Value)) {
      throw "package.json script mismatch: $($entry.Key)"
    }
  }

  $rule = Get-Content -LiteralPath $RulePath -Raw | ConvertFrom-Json
  if ($null -ne $rule.PSObject.Properties["include"]) {
    throw "$RulePath must not restrict review coverage through a top-level include list."
  }

  foreach ($required in Get-RequiredExclusions) {
    if ($required -notin @($rule.exclude)) {
      throw "OCR exclusion missing: $required"
    }
  }

  if (($null -eq $rule.PSObject.Properties["rules"]) -or @($rule.rules).Count -eq 0) {
    throw "OCR review rules are missing."
  }

  $nonMergingRules = @(
    $rule.rules | Where-Object {
      $_.PSObject.Properties.Name -notcontains "merge_system_rule" -or
      $_.merge_system_rule -ne $true
    }
  )
  if ($nonMergingRules.Count -gt 0) {
    throw "Every project OpenCodeReview rule must set merge_system_rule=true."
  }

  $git = (Get-Command git -ErrorAction Stop).Source
  $beforeHead = Invoke-ExternalCommand -FilePath $git -Arguments @("rev-parse", "HEAD") -Capture
  $beforeStatus = Invoke-ExternalCommand -FilePath $git -Arguments @(
    "status",
    "--porcelain=v1",
    "--untracked-files=all"
  ) -Capture

  Invoke-DelegatePreview -Ocr $Ocr

  $afterHead = Invoke-ExternalCommand -FilePath $git -Arguments @("rev-parse", "HEAD") -Capture
  $afterStatus = Invoke-ExternalCommand -FilePath $git -Arguments @(
    "status",
    "--porcelain=v1",
    "--untracked-files=all"
  ) -Capture

  if ($beforeHead -ne $afterHead) {
    throw "HEAD changed during OpenCodeReview verification."
  }
  if ($beforeStatus -ne $afterStatus) {
    throw "OpenCodeReview changed repository state during verification."
  }

  Write-Output "ocr_version=$($Ocr.Version)"
  Write-Output "rule_file=$RulePath"
  Write-Output "decision=PASS"
}

Push-Location $Root
try {
  Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json | Out-Null
  Get-Content -LiteralPath $RulePath -Raw | ConvertFrom-Json | Out-Null
  Get-Command git -ErrorAction Stop | Out-Null

  switch ($Mode) {
    "Setup" {
      $ocr = Get-OcrCommand -AllowInstall
      $changedPaths = Set-OpenCodeReviewConfiguration
      Test-OpenCodeReviewConfiguration -Ocr $ocr
      Write-Output "changed_paths=$($changedPaths -join ',')"
      break
    }
    "Repair" {
      $ocr = Get-OcrCommand -AllowInstall
      $changedPaths = Set-OpenCodeReviewConfiguration
      Test-OpenCodeReviewConfiguration -Ocr $ocr
      Write-Output "changed_paths=$($changedPaths -join ',')"
      break
    }
    "Version" {
      $ocr = Get-OcrCommand
      Write-Output $ocr.Version
      break
    }
    "Verify" {
      $ocr = Get-OcrCommand
      Test-OpenCodeReviewConfiguration -Ocr $ocr
      break
    }
    "DelegatePreview" {
      $ocr = Get-OcrCommand
      Invoke-DelegatePreview -Ocr $ocr
      break
    }
    "DelegateRules" {
      $ocr = Get-OcrCommand
      Invoke-DelegateRules -Ocr $ocr
      break
    }
    "DelegateAudit" {
      $ocr = Get-OcrCommand
      Invoke-DelegateAudit -Ocr $ocr
      break
    }
    "Full" {
      $ocr = Get-OcrCommand -AllowInstall
      $changedPaths = Set-OpenCodeReviewConfiguration
      Test-OpenCodeReviewConfiguration -Ocr $ocr
      Write-Output "changed_paths=$($changedPaths -join ',')"
      break
    }
  }
}
finally {
  Pop-Location
}

[CmdletBinding()]
param(
    [switch]$RunLint,
    [switch]$RunTests,
    [switch]$CommitAndPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$expectedBranch = "task/typescript-7-readiness"
$baseBranch = "smsm"
$typeScript7Version = "7.0.2"
$typeScript6PackageVersion = "6.0.2"
$typeScript6RuntimeVersion = "6.0.3"
$typeScript7Alias = "npm:typescript@$typeScript7Version"
$typeScript6Alias = "npm:@typescript/typescript6@$typeScript6PackageVersion"
$controlPanelPackage = "apps/control-panel/runtime/package.json"
$controlPanelNextConfig = "apps/control-panel/runtime/next.config.mjs"
$lockfile = "pnpm-lock.yaml"

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)
    Write-Host ""
    Write-Host "=== $Title ==="
}

function Invoke-Step {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    Write-Section $Name
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

function Invoke-Captured {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    $output = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE.`n$($output | Out-String)"
    }
    return ($output | Out-String).Trim()
}

function Assert-Exact {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Actual,
        [Parameter(Mandatory)][string]$Expected
    )

    if ($Actual -ne $Expected) {
        throw "$Label mismatch. Expected '$Expected', got '$Actual'."
    }
}

function Get-TrackedFileHash {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required tracked file is missing: $Path"
    }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Test-AllowedUpgradePath {
    param([Parameter(Mandatory)][string]$Path)

    if ($Path -in @(
        ".pnpmfile.cjs",
        "package.json",
        "pnpm-lock.yaml",
        "apps/control-panel/runtime/next.config.mjs",
        "apps/control-panel/runtime/next.config.ts"
    )) {
        return $true
    }

    return $Path -match '^(apps/[^/]+/runtime|core/[^/]+|services/[^/]+|shared/[^/]+)/package\.json$'
}

Push-Location (Resolve-Path ".").Path
try {
    Write-Section "Preflight"

    foreach ($command in @("git", "node", "pnpm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is not available in PATH."
        }
    }

    if (-not (Test-Path -LiteralPath "package.json")) {
        throw "Run this script from the repository root."
    }

    $currentBranch = Invoke-Captured -Name "Resolve current branch" -FilePath "git" -Arguments @("branch", "--show-current")
    if ($currentBranch -ne $expectedBranch) {
        throw "Wrong branch '$currentBranch'. Expected '$expectedBranch'."
    }

    $initialStatus = Invoke-Captured -Name "Read initial git status" -FilePath "git" -Arguments @("status", "--porcelain")
    if ($initialStatus) {
        Write-Host "Existing local changes detected; the script will replace only TypeScript-upgrade files:"
        Write-Host $initialStatus
    }

    Invoke-Step -Name "Fetch remote refs" -FilePath "git" -Arguments @("fetch", "origin", $expectedBranch, $baseBranch, "--prune")

    $localSha = Invoke-Captured -Name "Resolve local HEAD" -FilePath "git" -Arguments @("rev-parse", "HEAD")
    $remoteSha = Invoke-Captured -Name "Resolve remote HEAD" -FilePath "git" -Arguments @("rev-parse", "origin/$expectedBranch")
    if ($localSha -ne $remoteSha) {
        throw "Local HEAD '$localSha' differs from origin/$expectedBranch '$remoteSha'. Reset to the remote branch before rerunning."
    }

    $behindBase = [int](Invoke-Captured -Name "Check base divergence" -FilePath "git" -Arguments @("rev-list", "--count", "HEAD..origin/$baseBranch"))
    if ($behindBase -ne 0) {
        throw "Branch is behind origin/$baseBranch by $behindBase commit(s)."
    }

    Write-Host "Repository:                 $((Resolve-Path ".").Path)"
    Write-Host "Branch:                     $currentBranch"
    Write-Host "HEAD:                       $localSha"
    Write-Host "TypeScript 7 compiler:      $typeScript7Version"
    Write-Host "TS6 bridge package:         $typeScript6PackageVersion"
    Write-Host "TS6 bridge compiler/API:    $typeScript6RuntimeVersion"
    Write-Host "Next.js integration:        TS7 CLI + TS6 programmatic API"

    Write-Section "Restore pnpm install policy"
    @'
"use strict";

const EXPO_SDK_56_FORCED = Object.freeze({
  "expo-background-task": "~56.0.23",
  "expo-constants": "~56.0.22",
  "expo-linking": "~56.0.16",
  "expo-task-manager": "~56.0.23",
});

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

function applyForcedExpoSdk56Versions(pkg) {
  for (const sectionName of DEPENDENCY_SECTIONS) {
    const section = pkg[sectionName];
    if (!section || typeof section !== "object") continue;

    for (const [dependencyName, forcedVersion] of Object.entries(EXPO_SDK_56_FORCED)) {
      if (Object.prototype.hasOwnProperty.call(section, dependencyName)) {
        section[dependencyName] = forcedVersion;
      }
    }
  }
  return pkg;
}

function applyCompilerApiBridge(pkg) {
  if (pkg.name !== "openapi-typescript") return pkg;

  if (pkg.peerDependencies) delete pkg.peerDependencies.typescript;
  if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript;
  pkg.dependencies = {
    ...pkg.dependencies,
    typescript: "npm:@typescript/typescript6@6.0.2",
  };
  return pkg;
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      return applyCompilerApiBridge(applyForcedExpoSdk56Versions(pkg));
    },
  },
};
'@ | Set-Content -LiteralPath ".pnpmfile.cjs" -Encoding UTF8

    Write-Section "Remove unsafe Next.js TypeScript bypass"
    foreach ($file in @($controlPanelNextConfig, "apps/control-panel/runtime/next.config.ts")) {
        if (-not (Test-Path -LiteralPath $file)) { continue }
        $content = Get-Content -LiteralPath $file -Raw
        $content = $content -replace "(?s)\r?\n\s*typescript:\s*\{\s*ignoreBuildErrors:\s*true,?\s*\},", ""
        Set-Content -LiteralPath $file -Value $content -Encoding UTF8
        if ((Get-Content -LiteralPath $file -Raw) -match "ignoreBuildErrors\s*:\s*true") {
            throw "Unsafe Next.js ignoreBuildErrors remains in $file."
        }
    }

    Write-Section "Normalize TypeScript package policy"
    $transformScript = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-fix-ts7-$([guid]::NewGuid().ToString('N')).mjs"
    try {
        @'
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [nativeAlias, compatAlias, ts7Version] = process.argv.slice(2);
if (!nativeAlias || !compatAlias || !ts7Version) {
  throw new Error("Missing TypeScript policy arguments.");
}

const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const packageFiles = tracked.filter((file) => file === "package.json" || file.endsWith("/package.json"));
const touchedFiles = [];
let declarations = 0;

for (const file of packageFiles) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const isRoot = file === "package.json";
  const isNextWorkspace = Boolean(json.dependencies?.next || json.devDependencies?.next);
  const needsDualToolchain = isRoot || isNextWorkspace;
  let changed = false;

  for (const sectionName of sections) {
    const section = json[sectionName];
    if (!section) continue;

    if (Object.prototype.hasOwnProperty.call(section, "typescript")) {
      declarations += 1;
      const expected = needsDualToolchain ? compatAlias : ts7Version;
      if (section.typescript !== expected) {
        section.typescript = expected;
        changed = true;
      }
    }

    if (!needsDualToolchain && Object.prototype.hasOwnProperty.call(section, "@typescript/native")) {
      delete section["@typescript/native"];
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(section, "@typescript/typescript6")) {
      delete section["@typescript/typescript6"];
      changed = true;
    }
  }

  if (needsDualToolchain) {
    json.devDependencies ??= {};
    if (json.devDependencies.typescript !== compatAlias) {
      json.devDependencies.typescript = compatAlias;
      changed = true;
    }
    if (json.devDependencies["@typescript/native"] !== nativeAlias) {
      json.devDependencies["@typescript/native"] = nativeAlias;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
    touchedFiles.push(file);
  }
}

if (declarations === 0) throw new Error("No TypeScript declarations found.");
console.log(`TypeScript declarations: ${declarations}`);
console.log(`Updated package manifests: ${touchedFiles.length}`);
for (const file of touchedFiles) console.log(`- ${file}`);
'@ | Set-Content -LiteralPath $transformScript -Encoding UTF8

        Invoke-Step -Name "Apply TypeScript package policy" -FilePath "node" -Arguments @(
            $transformScript,
            $typeScript7Alias,
            $typeScript6Alias,
            $typeScript7Version
        )
    }
    finally {
        Remove-Item -LiteralPath $transformScript -Force -ErrorAction SilentlyContinue
    }

    Invoke-Step -Name "Regenerate pnpm lockfile" -FilePath "pnpm" -Arguments @(
        "install", "--lockfile-only", "--ignore-scripts", "--reporter=append-only"
    )
    Invoke-Step -Name "Install frozen workspace" -FilePath "pnpm" -Arguments @(
        "install", "--frozen-lockfile", "--reporter=append-only"
    )

    Write-Section "Verify root TypeScript toolchain"
    $rootTsc7 = Invoke-Captured -Name "Resolve root tsc" -FilePath "pnpm" -Arguments @("exec", "tsc", "--version")
    $rootTsc6 = Invoke-Captured -Name "Resolve root tsc6" -FilePath "pnpm" -Arguments @("exec", "tsc6", "--version")
    $rootApi = Invoke-Captured -Name "Resolve root TypeScript API" -FilePath "node" -Arguments @(
        "--input-type=module", "--eval", "import ts from 'typescript'; process.stdout.write(ts.version);"
    )
    Assert-Exact -Label "Root TypeScript 7 compiler" -Actual $rootTsc7 -Expected "Version $typeScript7Version"
    Assert-Exact -Label "Root TS6 compiler" -Actual $rootTsc6 -Expected "Version $typeScript6RuntimeVersion"
    Assert-Exact -Label "Root TS6 API" -Actual $rootApi -Expected $typeScript6RuntimeVersion

    Write-Section "Verify Next.js dual TypeScript toolchain"
    $nextTsc7 = Invoke-Captured -Name "Resolve control-panel tsc" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "exec", "tsc", "--version"
    )
    $nextTsc6 = Invoke-Captured -Name "Resolve control-panel tsc6" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "exec", "tsc6", "--version"
    )
    $nextApi = Invoke-Captured -Name "Resolve control-panel TypeScript API" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "exec", "node", "--input-type=module", "--eval",
        "import ts from 'typescript'; process.stdout.write(ts.version);"
    )
    Assert-Exact -Label "Control-panel TypeScript 7 compiler" -Actual $nextTsc7 -Expected "Version $typeScript7Version"
    Assert-Exact -Label "Control-panel TS6 compiler" -Actual $nextTsc6 -Expected "Version $typeScript6RuntimeVersion"
    Assert-Exact -Label "Control-panel TS6 API" -Actual $nextApi -Expected $typeScript6RuntimeVersion

    Write-Host "root tsc:          $rootTsc7"
    Write-Host "root tsc6/API:     $rootTsc6 / $rootApi"
    Write-Host "control-panel tsc: $nextTsc7"
    Write-Host "control-panel API: $nextApi"

    if (Test-Path -LiteralPath "tools/guards/_typescript-readiness-config-gate.mjs") {
        Invoke-Step -Name "TypeScript config governance" -FilePath "node" -Arguments @(
            "tools/guards/_typescript-readiness-config-gate.mjs"
        )
    }

    Invoke-Step -Name "Workspace typecheck with TypeScript 7" -FilePath "pnpm" -Arguments @("run", "typecheck")

    $packageHashBeforeBuild = Get-TrackedFileHash -Path $controlPanelPackage
    $rootHashBeforeBuild = Get-TrackedFileHash -Path "package.json"
    $lockHashBeforeBuild = Get-TrackedFileHash -Path $lockfile

    Invoke-Step -Name "Control panel build with Next.js TS6 API bridge" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "build"
    )

    Assert-Exact -Label "Control-panel package immutability during Next build" -Actual (Get-TrackedFileHash -Path $controlPanelPackage) -Expected $packageHashBeforeBuild
    Assert-Exact -Label "Root package immutability during Next build" -Actual (Get-TrackedFileHash -Path "package.json") -Expected $rootHashBeforeBuild
    Assert-Exact -Label "Lockfile immutability during Next build" -Actual (Get-TrackedFileHash -Path $lockfile) -Expected $lockHashBeforeBuild

    if ($RunLint) {
        Invoke-Step -Name "Workspace lint" -FilePath "pnpm" -Arguments @("run", "lint")
    }
    if ($RunTests) {
        Invoke-Step -Name "Workspace tests" -FilePath "pnpm" -Arguments @("run", "test")
    }

    Invoke-Step -Name "Diff whitespace check" -FilePath "git" -Arguments @("diff", "--check")

    Write-Section "Validate changed-file scope"
    $statusLines = @(& git status --porcelain=v1)
    if ($LASTEXITCODE -ne 0) { throw "Unable to read git status." }

    $unexpected = [System.Collections.Generic.List[string]]::new()
    foreach ($line in $statusLines) {
        if (-not $line) { continue }
        $path = $line.Substring(3).Trim()
        if ($path -match " -> ") { $path = ($path -split " -> ")[-1] }
        if (-not (Test-AllowedUpgradePath -Path $path)) {
            $unexpected.Add($path)
        }
    }
    if ($unexpected.Count -gt 0) {
        throw "Unexpected files changed during TypeScript upgrade:`n$($unexpected -join "`n")"
    }

    if ($statusLines.Count -eq 0) {
        Write-Host "Working tree is clean; no correction commit is required."
    }
    else {
        Write-Host ($statusLines -join "`n")
    }

    if ($CommitAndPush -and $statusLines.Count -gt 0) {
        Invoke-Step -Name "Stage TypeScript correction" -FilePath "git" -Arguments @("add", "--all")
        Invoke-Step -Name "Commit TypeScript correction" -FilePath "git" -Arguments @(
            "commit", "-m", "fix(ts): finalize TypeScript 7 with Next.js API bridge"
        )
        Invoke-Step -Name "Push TypeScript correction" -FilePath "git" -Arguments @(
            "push", "origin", "HEAD:$expectedBranch"
        )
    }

    Write-Section "Decision"
    Write-Host "TYPESCRIPT_7_CORRECTION_VERIFIED"
}
finally {
    Pop-Location
}

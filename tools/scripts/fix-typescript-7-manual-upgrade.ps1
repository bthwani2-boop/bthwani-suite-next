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
# @typescript/typescript6 publishes package 6.0.2, while its compiler/API reports 6.0.3.
$typeScript6PackageVersion = "6.0.2"
$typeScript6RuntimeVersion = "6.0.3"
$typeScript7RootAlias = "npm:typescript@$typeScript7Version"
$typeScript6RootAlias = "npm:@typescript/typescript6@$typeScript6PackageVersion"
$typeScript7WorkspaceSpecifier = $typeScript7Version

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

Push-Location (Resolve-Path ".").Path
try {
    Write-Section "Preflight"

    foreach ($command in @("git", "node", "pnpm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is not available in PATH."
        }
    }

    if (-not (Test-Path -LiteralPath "package.json")) {
        throw "Run this script from the repository root. Missing package.json."
    }

    $currentBranch = Invoke-Captured -Name "Resolve current branch" -FilePath "git" -Arguments @("branch", "--show-current")
    if ($currentBranch -ne $expectedBranch) {
        throw "Wrong branch '$currentBranch'. Expected '$expectedBranch'."
    }

    $initialStatus = Invoke-Captured -Name "Read initial git status" -FilePath "git" -Arguments @("status", "--porcelain")
    if ($initialStatus) {
        Write-Host "Existing local changes detected; continuing because this script is idempotent:"
        Write-Host $initialStatus
    }

    Invoke-Step -Name "Fetch remote refs" -FilePath "git" -Arguments @("fetch", "origin", $expectedBranch, $baseBranch, "--prune")

    $localSha = Invoke-Captured -Name "Resolve local HEAD" -FilePath "git" -Arguments @("rev-parse", "HEAD")
    $remoteSha = Invoke-Captured -Name "Resolve remote HEAD" -FilePath "git" -Arguments @("rev-parse", "origin/$expectedBranch")
    if ($localSha -ne $remoteSha) {
        throw "Local HEAD '$localSha' differs from origin/$expectedBranch '$remoteSha'. Reset to origin/$expectedBranch before rerunning."
    }

    $behindBase = [int](Invoke-Captured -Name "Check base divergence" -FilePath "git" -Arguments @("rev-list", "--count", "HEAD..origin/$baseBranch"))
    if ($behindBase -ne 0) {
        throw "Branch is behind origin/$baseBranch by $behindBase commit(s). Sync first."
    }

    Write-Host "Repository:                 $((Resolve-Path ".").Path)"
    Write-Host "Branch:                     $currentBranch"
    Write-Host "HEAD:                       $localSha"
    Write-Host "TypeScript 7 compiler:      $typeScript7Version"
    Write-Host "TS6 bridge package:         $typeScript6PackageVersion"
    Write-Host "TS6 bridge compiler/API:    $typeScript6RuntimeVersion"

    Write-Section "Restore pnpm install policy"
    $pnpmfile = @'
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

function applyTypeScriptCompilerApiBridge(pkg) {
  if (pkg.name !== "openapi-typescript") {
    return pkg;
  }

  if (pkg.peerDependencies) {
    delete pkg.peerDependencies.typescript;
  }
  if (pkg.peerDependenciesMeta) {
    delete pkg.peerDependenciesMeta.typescript;
  }

  pkg.dependencies = {
    ...pkg.dependencies,
    typescript: "__TS6_ALIAS__",
  };

  return pkg;
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      return applyTypeScriptCompilerApiBridge(applyForcedExpoSdk56Versions(pkg));
    },
  },
};
'@
    $pnpmfile = $pnpmfile.Replace("__TS6_ALIAS__", $typeScript6RootAlias)
    Set-Content -LiteralPath ".pnpmfile.cjs" -Value $pnpmfile -Encoding UTF8

    Write-Section "Remove unsafe Next.js TypeScript bypass"
    foreach ($file in @("apps/control-panel/runtime/next.config.mjs", "apps/control-panel/runtime/next.config.ts")) {
        if (-not (Test-Path -LiteralPath $file)) { continue }
        $content = Get-Content -LiteralPath $file -Raw
        $content = $content -replace "(?s)\r?\n\s*typescript:\s*\{\s*ignoreBuildErrors:\s*true,?\s*\},", ""
        Set-Content -LiteralPath $file -Value $content -Encoding UTF8
        $after = Get-Content -LiteralPath $file -Raw
        if ($after -match "ignoreBuildErrors\s*:\s*true") {
            throw "Unsafe Next.js ignoreBuildErrors remains in $file."
        }
    }

    Write-Section "Normalize TypeScript package policy"
    $transformScript = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-fix-ts7-$([guid]::NewGuid().ToString('N')).mjs"
    try {
        @'
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [rootNativeAlias, rootCompatAlias, workspaceTypeScript] = process.argv.slice(2);
if (!rootNativeAlias || !rootCompatAlias || !workspaceTypeScript) {
  throw new Error("Missing TypeScript policy arguments.");
}

const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const packageFiles = trackedFiles.filter((file) => file === "package.json" || file.endsWith("/package.json"));

let touched = 0;
let declarations = 0;
const touchedFiles = [];

for (const file of packageFiles) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  let changed = false;

  for (const sectionName of sections) {
    const section = json[sectionName];
    if (!section) continue;

    if (Object.prototype.hasOwnProperty.call(section, "typescript")) {
      declarations += 1;
      const expected = file === "package.json" ? rootCompatAlias : workspaceTypeScript;
      if (section.typescript !== expected) {
        section.typescript = expected;
        changed = true;
      }
    }

    if (file !== "package.json") {
      for (const name of ["@typescript/native", "@typescript/typescript6"]) {
        if (Object.prototype.hasOwnProperty.call(section, name)) {
          delete section[name];
          changed = true;
        }
      }
    }
  }

  if (file === "package.json") {
    json.devDependencies ??= {};
    if (json.devDependencies["@typescript/native"] !== rootNativeAlias) {
      json.devDependencies["@typescript/native"] = rootNativeAlias;
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(json.devDependencies, "@typescript/typescript6")) {
      delete json.devDependencies["@typescript/typescript6"];
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
    touched += 1;
    touchedFiles.push(file);
  }
}

if (declarations === 0) {
  throw new Error("No TypeScript declarations found in tracked package manifests.");
}

console.log(`TypeScript declarations: ${declarations}`);
console.log(`Updated package manifests: ${touched}`);
for (const file of touchedFiles) console.log(`- ${file}`);
'@ | Set-Content -LiteralPath $transformScript -Encoding UTF8

        Invoke-Step -Name "Apply TypeScript package policy" -FilePath "node" -Arguments @($transformScript, $typeScript7RootAlias, $typeScript6RootAlias, $typeScript7WorkspaceSpecifier)
    }
    finally {
        Remove-Item -LiteralPath $transformScript -Force -ErrorAction SilentlyContinue
    }

    Invoke-Step -Name "Regenerate pnpm lockfile" -FilePath "pnpm" -Arguments @("install", "--lockfile-only", "--ignore-scripts", "--reporter=append-only")
    Invoke-Step -Name "Install frozen workspace" -FilePath "pnpm" -Arguments @("install", "--frozen-lockfile", "--reporter=append-only")

    Write-Section "Verify TypeScript executables"
    $tsc7 = Invoke-Captured -Name "Resolve tsc" -FilePath "pnpm" -Arguments @("exec", "tsc", "--version")
    $tsc6 = Invoke-Captured -Name "Resolve tsc6" -FilePath "pnpm" -Arguments @("exec", "tsc6", "--version")
    $api = Invoke-Captured -Name "Resolve TypeScript API bridge" -FilePath "node" -Arguments @("--input-type=module", "--eval", "import ts from 'typescript'; process.stdout.write(ts.version);")

    Assert-Exact -Label "TypeScript 7 compiler" -Actual $tsc7 -Expected "Version $typeScript7Version"
    Assert-Exact -Label "TypeScript 6 compatibility compiler" -Actual $tsc6 -Expected "Version $typeScript6RuntimeVersion"
    Assert-Exact -Label "TypeScript API bridge" -Actual $api -Expected $typeScript6RuntimeVersion

    Write-Host "tsc:  $tsc7"
    Write-Host "tsc6: $tsc6"
    Write-Host "api:  $api"

    Write-Section "Validate package policy"
    $validationScript = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-validate-ts7-$([guid]::NewGuid().ToString('N')).mjs"
    try {
        @'
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [rootNativeAlias, rootCompatAlias, workspaceTypeScript] = process.argv.slice(2);
if (!rootNativeAlias || !rootCompatAlias || !workspaceTypeScript) {
  throw new Error("Missing TypeScript policy arguments.");
}

const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const violations = [];
let declarations = 0;
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const packageFiles = trackedFiles.filter((file) => file === "package.json" || file.endsWith("/package.json"));

for (const file of packageFiles) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const sectionName of sections) {
    const section = json[sectionName];
    if (!section) continue;

    if (Object.prototype.hasOwnProperty.call(section, "typescript")) {
      declarations += 1;
      const expected = file === "package.json" ? rootCompatAlias : workspaceTypeScript;
      if (section.typescript !== expected) {
        violations.push(`${file}:${sectionName}.typescript=${JSON.stringify(section.typescript)} expected=${JSON.stringify(expected)}`);
      }
    }
  }

  if (file === "package.json") {
    const nativeSpecifier = json.devDependencies?.["@typescript/native"];
    if (nativeSpecifier !== rootNativeAlias) {
      violations.push(`${file}:devDependencies.@typescript/native=${JSON.stringify(nativeSpecifier)} expected=${JSON.stringify(rootNativeAlias)}`);
    }
  }
}

if (declarations === 0) violations.push("No TypeScript declarations found.");

if (violations.length > 0) {
  console.error("TypeScript package policy violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Validated TypeScript declarations: ${declarations}`);
'@ | Set-Content -LiteralPath $validationScript -Encoding UTF8

        Invoke-Step -Name "Enforce TypeScript package policy" -FilePath "node" -Arguments @($validationScript, $typeScript7RootAlias, $typeScript6RootAlias, $typeScript7WorkspaceSpecifier)
    }
    finally {
        Remove-Item -LiteralPath $validationScript -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path -LiteralPath "tools/guards/_typescript-readiness-config-gate.mjs") {
        Invoke-Step -Name "TypeScript config governance" -FilePath "node" -Arguments @("tools/guards/_typescript-readiness-config-gate.mjs")
    }

    Invoke-Step -Name "Workspace typecheck" -FilePath "pnpm" -Arguments @("run", "typecheck")
    Invoke-Step -Name "Control panel build" -FilePath "pnpm" -Arguments @("--dir", "apps/control-panel/runtime", "build")

    if ($RunLint) {
        Invoke-Step -Name "Workspace lint" -FilePath "pnpm" -Arguments @("run", "lint")
    }

    if ($RunTests) {
        Invoke-Step -Name "Workspace tests" -FilePath "pnpm" -Arguments @("run", "test")
    }

    Invoke-Step -Name "Diff whitespace check" -FilePath "git" -Arguments @("diff", "--check")

    Write-Section "Git status"
    $finalStatus = Invoke-Captured -Name "Read final status" -FilePath "git" -Arguments @("status", "--short")
    if ($finalStatus) {
        Write-Host $finalStatus
    }
    else {
        Write-Host "Working tree is clean."
    }

    if ($CommitAndPush) {
        Invoke-Step -Name "Stage correction" -FilePath "git" -Arguments @("add", "--all")
        $staged = Invoke-Captured -Name "Read staged files" -FilePath "git" -Arguments @("diff", "--cached", "--name-only")
        if (-not $staged) {
            throw "No staged changes were found."
        }

        Invoke-Step -Name "Commit correction" -FilePath "git" -Arguments @("commit", "-m", "fix(ts): finalize TypeScript 7 upgrade policy")
        Invoke-Step -Name "Push correction" -FilePath "git" -Arguments @("push", "origin", "HEAD:$expectedBranch")
    }

    Write-Section "Decision"
    Write-Host "TYPESCRIPT_7_CORRECTION_VERIFIED"
}
finally {
    Pop-Location
}

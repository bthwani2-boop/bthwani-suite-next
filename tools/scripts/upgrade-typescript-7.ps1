[CmdletBinding()]
param(
    [switch]$VerifyOnly,
    [switch]$RunWorkspaceLint,
    [switch]$RunWorkspaceTests,
    [switch]$CommitAndPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$expectedBranch = "task/typescript-7-readiness"
$baseBranch = "smsm"
$typeScript7Version = "7.0.2"
$typeScript6CompatVersion = "6.0.2"
$typeScript7RootAlias = "npm:typescript@$typeScript7Version"
$typeScript6RootAlias = "npm:@typescript/typescript6@$typeScript6CompatVersion"
$typeScript7WorkspaceSpecifier = $typeScript7Version
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$packageJsonPath = Join-Path $repoRoot "package.json"

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)

    Write-Host ""
    Write-Host "=== $Title ==="
}

function Invoke-Native {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    Write-Section $Name
    $startedAt = Get-Date
    & $FilePath @Arguments
    $nativeExitCode = $LASTEXITCODE
    $elapsed = (Get-Date) - $startedAt

    if ($nativeExitCode -ne 0) {
        throw "$Name failed with exit code $nativeExitCode."
    }

    Write-Host ("Completed in {0:hh\:mm\:ss}." -f $elapsed)
}

function Invoke-Captured {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    $output = & $FilePath @Arguments 2>&1
    $nativeExitCode = $LASTEXITCODE
    if ($nativeExitCode -ne 0) {
        throw "$Name failed with exit code $nativeExitCode.`n$($output | Out-String)"
    }

    return ($output | Out-String).Trim()
}

function Assert-CleanWorktree {
    $status = Invoke-Captured -Name "Read git status" -FilePath "git" -Arguments @("status", "--porcelain")
    if ($status) {
        throw "The worktree must be clean before starting:`n$status"
    }
}

function Assert-Version {
    param(
        [Parameter(Mandatory)][string]$Actual,
        [Parameter(Mandatory)][string]$Expected,
        [Parameter(Mandatory)][string]$Label
    )

    if ($Actual -ne $Expected) {
        throw "$Label mismatch. Expected '$Expected', received '$Actual'."
    }
}

Push-Location $repoRoot
try {
    Write-Section "Preflight"

    foreach ($command in @("git", "node", "pnpm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is not available in PATH."
        }
    }

    if (-not (Test-Path -LiteralPath $packageJsonPath)) {
        throw "Missing root package.json: $packageJsonPath"
    }

    $currentBranch = Invoke-Captured -Name "Resolve current branch" -FilePath "git" -Arguments @("branch", "--show-current")
    if ($currentBranch -ne $expectedBranch) {
        throw "Wrong branch '$currentBranch'. Switch to '$expectedBranch' first."
    }

    Assert-CleanWorktree

    Invoke-Native -Name "Fetch immutable branch refs" -FilePath "git" -Arguments @(
        "fetch",
        "origin",
        $expectedBranch,
        $baseBranch,
        "--prune"
    )

    $localSha = Invoke-Captured -Name "Resolve local HEAD" -FilePath "git" -Arguments @("rev-parse", "HEAD")
    $remoteSha = Invoke-Captured -Name "Resolve remote HEAD" -FilePath "git" -Arguments @("rev-parse", "refs/remotes/origin/$expectedBranch")
    if ($localSha -ne $remoteSha) {
        throw "Local HEAD '$localSha' differs from origin/$expectedBranch '$remoteSha'. Run git pull --ff-only first."
    }

    $behindBase = [int](Invoke-Captured -Name "Check base divergence" -FilePath "git" -Arguments @(
        "rev-list",
        "--count",
        "HEAD..origin/$baseBranch"
    ))
    if ($behindBase -ne 0) {
        throw "The branch is behind origin/$baseBranch by $behindBase commit(s). Synchronize the branch before upgrading."
    }

    Write-Host "Repository:              $repoRoot"
    Write-Host "Branch:                  $currentBranch"
    Write-Host "Pinned SHA:              $localSha"
    Write-Host "TypeScript 7 compiler:   $typeScript7Version"
    Write-Host "TypeScript 6 API bridge: $typeScript6CompatVersion"

    if (-not $VerifyOnly) {
        Write-Section "Rewrite workspace TypeScript declarations"

        $transformScript = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-upgrade-typescript-7-$([guid]::NewGuid().ToString('N')).mjs"
        try {
            @'
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [rootNativeAlias, rootCompatAlias, workspaceTypeScript] = process.argv.slice(2);
if (!rootNativeAlias || !rootCompatAlias || !workspaceTypeScript) {
  throw new Error("Missing TypeScript package policy arguments.");
}

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const packageFiles = trackedFiles.filter(
  (file) => file === "package.json" || file.endsWith("/package.json"),
);

let updatedManifestCount = 0;
let declarationCount = 0;
const sections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

for (const file of packageFiles) {
  const source = fs.readFileSync(file, "utf8");
  const packageJson = JSON.parse(source);
  let changed = false;

  for (const sectionName of sections) {
    const section = packageJson[sectionName];
    if (!section || !Object.prototype.hasOwnProperty.call(section, "typescript")) {
      continue;
    }

    declarationCount += 1;
    const expected = file === "package.json" ? rootCompatAlias : workspaceTypeScript;
    if (section.typescript !== expected) {
      section.typescript = expected;
      changed = true;
    }
  }

  if (file === "package.json") {
    packageJson.devDependencies ??= {};
    if (packageJson.devDependencies["@typescript/native"] !== rootNativeAlias) {
      packageJson.devDependencies["@typescript/native"] = rootNativeAlias;
      changed = true;
    }

    if (Object.prototype.hasOwnProperty.call(packageJson.devDependencies, "@typescript/typescript6")) {
      delete packageJson.devDependencies["@typescript/typescript6"];
      changed = true;
    }
  } else {
    for (const sectionName of sections) {
      const section = packageJson[sectionName];
      if (!section) continue;
      for (const legacyName of ["@typescript/native", "@typescript/typescript6"]) {
        if (Object.prototype.hasOwnProperty.call(section, legacyName)) {
          delete section[legacyName];
          changed = true;
        }
      }
    }
  }

  if (!changed) {
    continue;
  }

  fs.writeFileSync(file, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  updatedManifestCount += 1;
}

if (declarationCount === 0) {
  throw new Error("No TypeScript declarations were found in tracked package manifests.");
}

console.log(`TypeScript declarations found: ${declarationCount}`);
console.log(`Package manifests updated: ${updatedManifestCount}`);
'@ | Set-Content -LiteralPath $transformScript -Encoding UTF8

            Invoke-Native -Name "Apply TypeScript 7 package policy" -FilePath "node" -Arguments @(
                $transformScript,
                $typeScript7RootAlias,
                $typeScript6RootAlias,
                $typeScript7WorkspaceSpecifier
            )
        }
        finally {
            Remove-Item -LiteralPath $transformScript -Force -ErrorAction SilentlyContinue
        }

        Invoke-Native -Name "Regenerate deterministic PNPM lockfile" -FilePath "pnpm" -Arguments @(
            "install",
            "--lockfile-only",
            "--ignore-scripts",
            "--reporter=append-only"
        )
    }

    Invoke-Native -Name "Install frozen upgraded workspace" -FilePath "pnpm" -Arguments @(
        "install",
        "--frozen-lockfile",
        "--reporter=append-only"
    )

    Write-Section "Verify dual TypeScript toolchain"
    $typeScript7Output = Invoke-Captured -Name "Resolve TypeScript 7 compiler" -FilePath "pnpm" -Arguments @(
        "exec",
        "tsc",
        "--version"
    )
    $typeScript6Output = Invoke-Captured -Name "Resolve TypeScript 6 compatibility compiler" -FilePath "pnpm" -Arguments @(
        "exec",
        "tsc6",
        "--version"
    )

    Assert-Version -Actual $typeScript7Output -Expected "Version $typeScript7Version" -Label "TypeScript 7 compiler"
    Assert-Version -Actual $typeScript6Output -Expected "Version $typeScript6CompatVersion" -Label "TypeScript 6 compatibility compiler"

    Write-Host $typeScript7Output
    Write-Host $typeScript6Output

    $apiVersion = Invoke-Captured -Name "Resolve TypeScript Compiler API bridge" -FilePath "node" -Arguments @(
        "--input-type=module",
        "--eval",
        "import ts from 'typescript'; process.stdout.write(ts.version);"
    )
    Assert-Version -Actual $apiVersion -Expected $typeScript6CompatVersion -Label "TypeScript Compiler API bridge"
    Write-Host "Compiler API bridge: Version $apiVersion"

    Write-Section "Validate package policy"
    $validationScript = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-validate-typescript-7-$([guid]::NewGuid().ToString('N')).mjs"
    try {
        @'
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [rootNativeAlias, rootCompatAlias, workspaceTypeScript] = process.argv.slice(2);
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const packageFiles = trackedFiles.filter(
  (file) => file === "package.json" || file.endsWith("/package.json"),
);
const violations = [];
let declarationCount = 0;
const sections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

for (const file of packageFiles) {
  const packageJson = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const sectionName of sections) {
    const section = packageJson[sectionName];
    if (!section || !Object.prototype.hasOwnProperty.call(section, "typescript")) {
      continue;
    }

    declarationCount += 1;
    const expected = file === "package.json" ? rootCompatAlias : workspaceTypeScript;
    if (section.typescript !== expected) {
      violations.push(
        `${file}:${sectionName}.typescript=${JSON.stringify(section.typescript)} expected=${JSON.stringify(expected)}`,
      );
    }
  }

  if (file === "package.json") {
    const nativeSpecifier = packageJson.devDependencies?.["@typescript/native"];
    if (nativeSpecifier !== rootNativeAlias) {
      violations.push(
        `${file}:devDependencies.@typescript/native=${JSON.stringify(nativeSpecifier)}`,
      );
    }
  }
}

if (declarationCount === 0) {
  violations.push("No TypeScript declarations found.");
}

if (violations.length > 0) {
  console.error("TypeScript package policy violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Validated ${declarationCount} TypeScript declarations.`);
'@ | Set-Content -LiteralPath $validationScript -Encoding UTF8

        Invoke-Native -Name "Enforce TypeScript 7 package policy" -FilePath "node" -Arguments @(
            $validationScript,
            $typeScript7RootAlias,
            $typeScript6RootAlias,
            $typeScript7WorkspaceSpecifier
        )
    }
    finally {
        Remove-Item -LiteralPath $validationScript -Force -ErrorAction SilentlyContinue
    }

    Invoke-Native -Name "TypeScript configuration governance" -FilePath "node" -Arguments @(
        "tools/guards/_typescript-readiness-config-gate.mjs"
    )

    Invoke-Native -Name "Workspace TypeScript typecheck" -FilePath "pnpm" -Arguments @(
        "run",
        "typecheck"
    )

    Invoke-Native -Name "Control panel production build" -FilePath "pnpm" -Arguments @(
        "--dir",
        "apps/control-panel/runtime",
        "build"
    )

    if ($RunWorkspaceLint) {
        Invoke-Native -Name "Optional workspace lint" -FilePath "pnpm" -Arguments @(
            "run",
            "lint"
        )
    }

    if ($RunWorkspaceTests) {
        Invoke-Native -Name "Optional workspace tests" -FilePath "pnpm" -Arguments @(
            "run",
            "test"
        )
    }

    Invoke-Native -Name "Diff whitespace validation" -FilePath "git" -Arguments @(
        "diff",
        "--check"
    )

    Write-Section "Upgrade result"
    Write-Host "TypeScript 7 compiler:       $typeScript7Version"
    Write-Host "TypeScript 6 API bridge:     $typeScript6CompatVersion"
    Write-Host "Workspace typecheck:         PASS"
    Write-Host "Control panel build:         PASS"
    Write-Host "Workspace lint requested:    $([bool]$RunWorkspaceLint)"
    Write-Host "Workspace tests requested:   $([bool]$RunWorkspaceTests)"

    $status = Invoke-Captured -Name "Read final git status" -FilePath "git" -Arguments @(
        "status",
        "--short"
    )

    if ($status) {
        Write-Host ""
        Write-Host "Changed files:"
        Write-Host $status
    }
    else {
        Write-Host "Working tree: clean"
    }

    if ($CommitAndPush -and -not $VerifyOnly) {
        Invoke-Native -Name "Stage TypeScript 7 upgrade" -FilePath "git" -Arguments @("add", "--all")

        $cachedDiff = Invoke-Captured -Name "Inspect staged upgrade" -FilePath "git" -Arguments @(
            "diff",
            "--cached",
            "--name-only"
        )
        if (-not $cachedDiff) {
            throw "No upgrade changes were staged."
        }

        Invoke-Native -Name "Commit TypeScript 7 upgrade" -FilePath "git" -Arguments @(
            "commit",
            "-m",
            "feat(ts): upgrade workspace compiler to TypeScript 7.0.2"
        )
        Invoke-Native -Name "Push TypeScript 7 upgrade" -FilePath "git" -Arguments @(
            "push",
            "origin",
            "HEAD:$expectedBranch"
        )
    }

    Write-Host ""
    Write-Host "Decision: TYPESCRIPT_7_UPGRADE_VERIFIED"
    Write-Host "Next verification command: pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\scripts\verify-typescript-7-readiness.ps1"
}
finally {
    Pop-Location
}

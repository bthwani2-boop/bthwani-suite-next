[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [ValidateSet('up', 'down', 'reset', 'status', 'smoke')]
  [string]$Action = 'up',

  [Parameter(Mandatory = $false)]
  [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RuntimeScript = Join-Path $RepoRoot 'infra\docker\scripts\runtime.ps1'
$WireMockSmoke = Join-Path $RepoRoot 'tools\scripts\smoke-wiremock-financial-provider.ps1'
$WltProviderSmoke = Join-Path $RepoRoot 'tools\scripts\smoke-wlt-provider-through-wlt.ps1'
$WltPayoutSmoke = Join-Path $RepoRoot 'tools\scripts\smoke-wlt-payout-provider.ps1'

function Assert-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
  Write-Host "$Name: PASS" -ForegroundColor Green
}

function Invoke-Runtime {
  param(
    [Parameter(Mandatory = $true)][string]$RuntimeAction,
    [Parameter(Mandatory = $true)][string]$Profiles
  )
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimeScript -Action $RuntimeAction -Profiles $Profiles
}

function Invoke-FinancialJourneys {
  Invoke-Step 'WireMock provider smoke' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $WireMockSmoke
  }
  Invoke-Step 'Card authorize/capture through WLT' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $WltProviderSmoke
  }
  Invoke-Step 'Provider-backed payout through WLT' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File $WltPayoutSmoke
  }
}

Assert-Command 'docker'
Assert-Command 'pwsh'

Push-Location $RepoRoot
try {
  Invoke-Step 'Docker engine availability' {
    docker info --format '{{.ServerVersion}}'
  }

  switch ($Action) {
    'up' {
      Invoke-Step 'Start WLT and financial simulator containers' {
        Invoke-Runtime -RuntimeAction 'up' -Profiles 'wlt,financial-simulators'
      }
      Invoke-Step 'Apply WLT migrations' {
        Invoke-Runtime -RuntimeAction 'migrate' -Profiles 'wlt'
      }
      if (-not $SkipSeed) {
        Invoke-Step 'Seed WLT local financial data' {
          Invoke-Runtime -RuntimeAction 'seed' -Profiles 'wlt'
        }
      }
      Invoke-Step 'WLT runtime smoke' {
        Invoke-Runtime -RuntimeAction 'smoke' -Profiles 'wlt'
      }
      Invoke-FinancialJourneys
      Write-Host "`nFinancial simulator is ready." -ForegroundColor Green
      Write-Host 'WLT API: http://localhost:58083'
      Write-Host 'WireMock financial provider: http://localhost:58090'
    }

    'down' {
      Invoke-Step 'Stop and remove WLT and financial simulator containers' {
        Invoke-Runtime -RuntimeAction 'down' -Profiles 'wlt,financial-simulators'
      }
    }

    'reset' {
      Invoke-Step 'Reset WLT and financial simulator containers and volumes' {
        Invoke-Runtime -RuntimeAction 'reset' -Profiles 'wlt,financial-simulators'
      }
      Invoke-Step 'Apply WLT migrations after reset' {
        Invoke-Runtime -RuntimeAction 'migrate' -Profiles 'wlt'
      }
      if (-not $SkipSeed) {
        Invoke-Step 'Seed WLT after reset' {
          Invoke-Runtime -RuntimeAction 'seed' -Profiles 'wlt'
        }
      }
      Invoke-Step 'WLT runtime smoke after reset' {
        Invoke-Runtime -RuntimeAction 'smoke' -Profiles 'wlt'
      }
      Invoke-FinancialJourneys
    }

    'status' {
      Invoke-Step 'WLT and financial simulator status' {
        Invoke-Runtime -RuntimeAction 'status' -Profiles 'wlt,financial-simulators'
      }
    }

    'smoke' {
      Invoke-Step 'WLT runtime smoke' {
        Invoke-Runtime -RuntimeAction 'smoke' -Profiles 'wlt'
      }
      Invoke-FinancialJourneys
    }
  }
}
finally {
  Pop-Location
}

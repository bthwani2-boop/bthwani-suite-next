Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Stop"

$ProfileArgIndex = [Array]::IndexOf($args, "-Profile")
$Profiles = if ($ProfileArgIndex -ge 0 -and ($ProfileArgIndex + 1) -lt $args.Count) {
  $args[$ProfileArgIndex + 1].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
} else {
  @()
}

$AllowedProfiles = @("media", "dsh")
foreach ($profile in $Profiles) {
  if ($AllowedProfiles -notcontains $profile) {
    throw "Unsupported runtime profile: $profile. Allowed: media, dsh. Postgres runs by default without a profile."
  }
}

$ComposeFile = "infra\docker\compose.runtime.yml"
$EnvFile = "infra\docker\env\runtime.env.example"

docker info | Out-Null

$ComposeArgs = @("--env-file", $EnvFile, "-f", $ComposeFile)
$ProfileArgs = @()
foreach ($profile in $Profiles) {
  $ProfileArgs += @("--profile", $profile)
}

docker compose @ComposeArgs @ProfileArgs up -d

& "infra\docker\scripts\smoke-runtime.ps1"
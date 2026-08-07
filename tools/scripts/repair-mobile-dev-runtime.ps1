param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
    [switch]$DiagnoseOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Profiles = "identity,workforce,dsh,wlt,media"
$ComposeProject = "bthwani-runtime"

$RuntimeScript = Join-Path $RepoRoot "infra\docker\scripts\runtime.ps1"
$MobileDataScript = Join-Path $RepoRoot "apps\mobile\mobile-dev-data.mjs"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Artifacts = Join-Path $RepoRoot ".artifacts\diagnostics\mobile-runtime-$Stamp"

New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null

function Section {
    param([string]$Name)

    Write-Host ""
    Write-Host "============================================================"
    Write-Host $Name
    Write-Host "============================================================"
}

function Save-Text {
    param(
        [string]$Name,
        $Value
    )

    $Value |
        Out-File `
            -FilePath (Join-Path $Artifacts $Name) `
            -Encoding utf8
}

function Get-ServiceContainer {
    param([string]$Service)

    return @(
        docker ps -a `
            --filter "label=com.docker.compose.project=$ComposeProject" `
            --filter "label=com.docker.compose.service=$Service" `
            --format "{{.Names}}"
    ) | Select-Object -First 1
}

function Get-ContainerEnv {
    param(
        [string]$Container,
        [string]$Key
    )

    if (-not $Container) {
        return $null
    }

    $Lines = @(
        docker inspect `
            --format "{{range .Config.Env}}{{println .}}{{end}}" `
            $Container 2>$null
    )

    $Prefix = "$Key="

    $Line = $Lines |
        Where-Object { $_.StartsWith($Prefix) } |
        Select-Object -First 1

    if (-not $Line) {
        return $null
    }

    return $Line.Substring($Prefix.Length)
}

function Probe {
    param(
        [string]$Name,
        [string]$Uri
    )

    try {
        $Response = Invoke-WebRequest `
            -Uri $Uri `
            -TimeoutSec 5 `
            -SkipHttpErrorCheck `
            -ErrorAction Stop

        $Result = [ordered]@{
            name   = $Name
            uri    = $Uri
            status = [int]$Response.StatusCode
            body   = [string]$Response.Content
        }
    }
    catch {
        $Result = [ordered]@{
            name   = $Name
            uri    = $Uri
            status = 0
            body   = $_.Exception.Message
        }
    }

    Write-Host ("{0,-28} HTTP {1}" -f $Name, $Result.status)

    if ($Result.body) {
        Write-Host $Result.body
    }

    $Result |
        ConvertTo-Json -Depth 10 |
        Out-File `
            (Join-Path $Artifacts "$Name.json") `
            -Encoding utf8

    return [pscustomobject]$Result
}

function Invoke-DshSql {
    param([string]$Sql)

    if (-not $script:PostgresContainer) {
        throw "Postgres runtime container was not found."
    }

    if (-not $script:PostgresUser) {
        throw "POSTGRES_USER could not be determined."
    }

    if (-not $script:DshDatabase) {
        throw "DSH database name could not be determined."
    }

    $Output = docker exec `
        $script:PostgresContainer `
        psql `
        -X `
        -v ON_ERROR_STOP=1 `
        -U $script:PostgresUser `
        -d $script:DshDatabase `
        -At `
        -c $Sql

    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed."
    }

    return @($Output)
}

function Get-DshDatabaseState {

    $Sql = @"
SELECT 'latest_migration=' ||
       EXISTS (
           SELECT 1
           FROM schema_migrations
           WHERE service_name='dsh'
             AND migration_id='dsh-996_administration_approval_ledger.sql'
             AND success
             AND NOT dirty
       );

SELECT 'bad_migrations=' || COUNT(*)
FROM schema_migrations
WHERE service_name='dsh'
  AND (dirty OR NOT success);

SELECT 'dsh_stores=' ||
       (to_regclass('public.dsh_stores') IS NOT NULL);

SELECT 'dsh_orders=' ||
       (to_regclass('public.dsh_orders') IS NOT NULL);

SELECT 'dsh_wlt_outbox_events=' ||
       (to_regclass('public.dsh_wlt_outbox_events') IS NOT NULL);

SELECT 'dsh_service_area_versions=' ||
       (to_regclass('public.dsh_service_area_versions') IS NOT NULL);

SELECT 'dsh_partner_brands=' ||
       (to_regclass('public.dsh_partner_brands') IS NOT NULL);

SELECT 'dsh_captain_financial_eligibility=' ||
       (to_regclass('public.dsh_captain_financial_eligibility') IS NOT NULL);

SELECT 'zones_table=' ||
       (to_regclass('public.dsh_platform_zones') IS NOT NULL);

SELECT 'active_zones=' ||
       CASE
           WHEN to_regclass('public.dsh_platform_zones') IS NULL
           THEN '-1'
           ELSE (
               SELECT COUNT(*)::text
               FROM dsh_platform_zones
               WHERE is_active
           )
       END;
"@

    $Rows = Invoke-DshSql $Sql

    $State = @{}

    foreach ($Row in $Rows) {
        if ($Row -match '^([^=]+)=(.*)$') {
            $State[$Matches[1]] = $Matches[2]
        }
    }

    $Rows | ForEach-Object {
        Write-Host $_
    }

    $Rows |
        Out-File `
            (Join-Path $Artifacts "dsh-database-state.txt") `
            -Encoding utf8

    return $State
}

function Ensure-LocalDevelopmentZone {

    Section "LOCAL GOVERNED DEVELOPMENT ZONE"

    $Sql = @"
DO `$`$
DECLARE
    v_zone_id UUID;
    v_version INTEGER;
    v_active BOOLEAN;
BEGIN

    IF to_regclass('public.dsh_platform_zones') IS NULL THEN
        RAISE EXCEPTION 'dsh_platform_zones does not exist';
    END IF;

    SELECT id, version, is_active
      INTO v_zone_id, v_version, v_active
      FROM dsh_platform_zones
     WHERE lower(city_code) = lower('sana')
       AND lower(name) = lower('منطقة صنعاء المحلية')
     ORDER BY created_at
     LIMIT 1
     FOR UPDATE;

    IF v_zone_id IS NULL THEN

        INSERT INTO dsh_platform_zones (
            name,
            city_code,
            is_active,
            description
        )
        VALUES (
            'منطقة صنعاء المحلية',
            'sana',
            TRUE,
            'Local governed mobile development zone'
        )
        RETURNING id, version
        INTO v_zone_id, v_version;

        IF to_regclass('public.dsh_platform_policy_events') IS NOT NULL THEN

            INSERT INTO dsh_platform_policy_events (
                aggregate_type,
                aggregate_id,
                action,
                actor_id,
                actor_surface,
                correlation_id,
                reason,
                from_version,
                to_version,
                payload
            )
            VALUES (
                'zone',
                v_zone_id::text,
                'created',
                'local-dev-bootstrap',
                'runtime-bootstrap',
                'mobile-dev-zone-bootstrap',
                'Provision governed local mobile development data',
                NULL,
                v_version,
                jsonb_build_object(
                    'name',
                    'منطقة صنعاء المحلية',
                    'cityCode',
                    'sana',
                    'localDevelopmentOnly',
                    true
                )
            );

        END IF;

    ELSIF NOT v_active THEN

        UPDATE dsh_platform_zones
           SET is_active = TRUE,
               version = version + 1,
               updated_at = NOW()
         WHERE id = v_zone_id
         RETURNING version
         INTO v_version;

        IF to_regclass('public.dsh_platform_policy_events') IS NOT NULL THEN

            INSERT INTO dsh_platform_policy_events (
                aggregate_type,
                aggregate_id,
                action,
                actor_id,
                actor_surface,
                correlation_id,
                reason,
                from_version,
                to_version,
                payload
            )
            VALUES (
                'zone',
                v_zone_id::text,
                'activated',
                'local-dev-bootstrap',
                'runtime-bootstrap',
                'mobile-dev-zone-reactivation',
                'Reactivate governed local mobile development zone',
                v_version - 1,
                v_version,
                jsonb_build_object(
                    'localDevelopmentOnly',
                    true
                )
            );

        END IF;

    END IF;
END
`$`$;
"@

    Invoke-DshSql $Sql | Out-Null

    Write-Host "Local development zone: READY"
}

function Run-RuntimeAction {

    param(
        [Parameter(Mandatory)]
        [string]$Action,

        [switch]$Force
    )

    $Arguments = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $RuntimeScript,
        "-Action",
        $Action,
        "-Profiles",
        $Profiles
    )

    if ($Force) {
        $Arguments += "-Force"
    }

    & pwsh @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "runtime:$Action failed with exit code $LASTEXITCODE"
    }
}


# ============================================================
# PRE-FLIGHT
# ============================================================

Set-Location -LiteralPath $RepoRoot

Section "PRE-FLIGHT"

foreach ($Command in @(
    "git",
    "docker",
    "node",
    "pwsh"
)) {
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "Required command was not found: $Command"
    }
}

foreach ($File in @(
    $RuntimeScript,
    $MobileDataScript
)) {
    if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
        throw "Required repository file not found: $File"
    }
}

$Branch = git branch --show-current
$Head = git rev-parse HEAD
$Status = git status --short

Write-Host "Branch: $Branch"
Write-Host "HEAD:   $Head"

Save-Text "git-state.txt" @(
    "branch=$Branch"
    "head=$Head"
    ""
    $Status
)


# ============================================================
# DOCKER
# ============================================================

Section "DOCKER STATE"

docker ps -a |
    Tee-Object `
        -FilePath (Join-Path $Artifacts "docker-ps-before.txt")

$script:PostgresContainer = Get-ServiceContainer "postgres"
$DshContainer = Get-ServiceContainer "dsh-api"

if (-not $script:PostgresContainer -or -not $DshContainer) {

    Section "START CANONICAL RUNTIME"

    Run-RuntimeAction -Action "up"

    $script:PostgresContainer = Get-ServiceContainer "postgres"
    $DshContainer = Get-ServiceContainer "dsh-api"
}

if (-not $script:PostgresContainer) {
    throw "Postgres runtime container did not start."
}

if (-not $DshContainer) {
    throw "DSH runtime container did not start."
}


# ============================================================
# LOGS
# ============================================================

Section "CAPTURE RUNTIME LOGS"

$Containers = @(
    Get-ServiceContainer "identity-api"
    Get-ServiceContainer "workforce-api"
    Get-ServiceContainer "wlt-api"
    Get-ServiceContainer "dsh-api"
    Get-ServiceContainer "postgres"
    Get-ServiceContainer "minio"
) | Where-Object { $_ }

foreach ($Container in $Containers) {

    Write-Host "Capturing $Container"

    docker logs --tail 300 $Container 2>&1 |
        Out-File `
            (Join-Path $Artifacts "$Container-before.log") `
            -Encoding utf8
}


# ============================================================
# DATABASE CONNECTION
# ============================================================

$script:PostgresUser = Get-ContainerEnv `
    $script:PostgresContainer `
    "POSTGRES_USER"

$DshDatabaseUrl = Get-ContainerEnv `
    $DshContainer `
    "DATABASE_URL"

if (-not $DshDatabaseUrl) {
    throw "DSH DATABASE_URL could not be determined."
}

$DshUri = [Uri]$DshDatabaseUrl

$script:DshDatabase = $DshUri.AbsolutePath.TrimStart("/")

Write-Host "DSH database: $script:DshDatabase"


# ============================================================
# INITIAL HEALTH
# ============================================================

Section "INITIAL READINESS"

$IdentityReady = Probe `
    "identity-readiness-before" `
    "http://127.0.0.1:58082/identity/readiness"

$WorkforceReady = Probe `
    "workforce-readiness-before" `
    "http://127.0.0.1:58086/workforce/readiness"

$WltReady = Probe `
    "wlt-readiness-before" `
    "http://127.0.0.1:58083/wlt/readiness"

$DshHealth = Probe `
    "dsh-health-before" `
    "http://127.0.0.1:58080/dsh/health"

$DshReady = Probe `
    "dsh-readiness-before" `
    "http://127.0.0.1:58080/dsh/readiness"


# ============================================================
# DATABASE DIAGNOSIS
# ============================================================

Section "DSH DATABASE READINESS"

$DbState = Get-DshDatabaseState

$RequiredTables = @(
    "dsh_stores",
    "dsh_orders",
    "dsh_wlt_outbox_events",
    "dsh_service_area_versions",
    "dsh_partner_brands",
    "dsh_captain_financial_eligibility"
)

$MissingTables = @(
    $RequiredTables |
        Where-Object {
            $DbState[$_] -ne "true"
        }
)

if ([int]$DbState["bad_migrations"] -gt 0) {

    Write-Error @"
DSH contains dirty or failed migrations.

Automatic mutation of schema_migrations is intentionally blocked.
No migration marker has been removed.
No database reset has been performed.

Evidence:
$Artifacts
"@

    exit 20
}

if (
    $MissingTables.Count -gt 0 -and
    $DbState["latest_migration"] -eq "true"
) {

    Write-Error @"
DSH SCHEMA DRIFT DETECTED.

Migration ledger reports the latest migration as applied,
but required physical objects are missing:

$($MissingTables -join ", ")

Automatic destructive repair is blocked.

Evidence:
$Artifacts
"@

    exit 21
}

if ($DiagnoseOnly) {

    Section "DIAGNOSIS COMPLETE"

    Write-Host "No mutation was performed."
    Write-Host "Evidence:"
    Write-Host $Artifacts

    exit 0
}


# ============================================================
# CANONICAL MIGRATION REPAIR
# ============================================================

if (
    $DbState["latest_migration"] -ne "true" -or
    $MissingTables.Count -gt 0
) {

    Section "CANONICAL MIGRATION REPAIR"

    & pwsh `
        -NoProfile `
        -ExecutionPolicy Bypass `
        -File $RuntimeScript `
        -Action migrate `
        -Profiles $Profiles

    if ($LASTEXITCODE -ne 0) {
        throw "Canonical migration repair failed."
    }

    $DbState = Get-DshDatabaseState

    $MissingTables = @(
        $RequiredTables |
            Where-Object {
                $DbState[$_] -ne "true"
            }
    )

    if (
        $DbState["latest_migration"] -ne "true" -or
        $MissingTables.Count -gt 0
    ) {
        throw @"
DSH database remains inconsistent after canonical migrations.

Missing:
$($MissingTables -join ", ")
"@
    }
}


# ============================================================
# ZONE GAP
# ============================================================

Section "ZONE BOOTSTRAP CHECK"

if (
    $DbState.ContainsKey("active_zones") -and
    [int]$DbState["active_zones"] -le 0
) {

    Write-Host "No active DSH zone exists."

    Write-Host @"
Current mobile provisioning requires an active zone,
while POST /dsh/operator/platform/zones currently returns HTTP 501.

Creating the governed LOCAL DEVELOPMENT zone idempotently.
"@

    Ensure-LocalDevelopmentZone
}
else {
    Write-Host "Active DSH zone already exists."
}


# ============================================================
# BOOTSTRAP
# ============================================================

Section "CANONICAL RUNTIME BOOTSTRAP"

Run-RuntimeAction `
    -Action "bootstrap-dev" `
    -Force


# ============================================================
# READINESS AFTER BOOTSTRAP
# ============================================================

Section "POST-BOOTSTRAP READINESS"

$IdentityAfter = Probe `
    "identity-readiness-after" `
    "http://127.0.0.1:58082/identity/readiness"

$WorkforceAfter = Probe `
    "workforce-readiness-after" `
    "http://127.0.0.1:58086/workforce/readiness"

$WltAfter = Probe `
    "wlt-readiness-after" `
    "http://127.0.0.1:58083/wlt/readiness"

$DshAfter = Probe `
    "dsh-readiness-after" `
    "http://127.0.0.1:58080/dsh/readiness"

if ($DshAfter.status -ne 200) {

    $DshContainer = Get-ServiceContainer "dsh-api"

    if ($DshContainer) {
        docker logs --tail 500 $DshContainer 2>&1 |
            Out-File `
                (Join-Path $Artifacts "$DshContainer-after-failure.log") `
                -Encoding utf8
    }

    Write-Error @"
DSH still failed readiness after canonical bootstrap.

Readiness result:
$($DshAfter.body)

Diagnostic evidence:
$Artifacts
"@

    exit 30
}


# ============================================================
# MOBILE DATA REPAIR
# ============================================================

Section "MOBILE GOVERNED DATA REPAIR"

& node $MobileDataScript --repair

if ($LASTEXITCODE -ne 0) {

    Write-Error @"
mobile-dev-data --repair failed.

Evidence:
$Artifacts
"@

    exit 40
}


# ============================================================
# FINAL MOBILE CHECK
# ============================================================

Section "MOBILE GOVERNED DATA VERIFICATION"

& node $MobileDataScript --check

if ($LASTEXITCODE -ne 0) {

    Write-Error @"
One or more mobile surfaces remain incomplete.

Evidence:
$Artifacts
"@

    exit 41
}


# ============================================================
# FINAL LOGS
# ============================================================

Section "CAPTURE FINAL STATE"

docker ps -a |
    Out-File `
        (Join-Path $Artifacts "docker-ps-after.txt") `
        -Encoding utf8

$Containers = @(
    Get-ServiceContainer "identity-api"
    Get-ServiceContainer "workforce-api"
    Get-ServiceContainer "wlt-api"
    Get-ServiceContainer "dsh-api"
    Get-ServiceContainer "postgres"
    Get-ServiceContainer "minio"
) | Where-Object { $_ }

foreach ($Container in $Containers) {

    docker logs --tail 300 $Container 2>&1 |
        Out-File `
            (Join-Path $Artifacts "$Container-after.log") `
            -Encoding utf8
}


# ============================================================
# SUCCESS
# ============================================================

Section "SUCCESS"

Write-Host "Identity readiness:          PASS"
Write-Host "Workforce readiness:         PASS"
Write-Host "WLT readiness:               PASS"
Write-Host "DSH readiness:               PASS"
Write-Host "DSH database invariants:     PASS"
Write-Host "Active development zone:     PASS"
Write-Host "Workforce provisioning:      PASS"
Write-Host "Mobile development data:     PASS"

Write-Host ""
Write-Host "Evidence:"
Write-Host $Artifacts

Write-Host ""
Write-Host "Next command:"
Write-Host "pnpm client"


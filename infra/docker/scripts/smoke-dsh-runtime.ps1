$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

$ComposeFile = ".\infra\docker\compose.runtime.yml"
$EnvFile     = ".\infra\docker\env\runtime.env.example"

Write-Host "=== DSH runtime smoke ==="

Write-Host "`n--- docker ps (dsh profile) ---"
docker compose --env-file $EnvFile -f $ComposeFile --profile dsh ps

Write-Host "`n--- GET /dsh/health ---"
$health = Invoke-RestMethod -Uri "http://localhost:58080/dsh/health" -Method GET -TimeoutSec 10
Write-Host ($health | ConvertTo-Json -Depth 5)
if ($health.status -ne "healthy") { throw "DSH health status is not healthy: $($health.status)" }

Write-Host "`n--- GET /dsh/readiness ---"
$readiness = Invoke-RestMethod -Uri "http://localhost:58080/dsh/readiness" -Method GET -TimeoutSec 10
Write-Host ($readiness | ConvertTo-Json -Depth 5)
if ($readiness.status -ne "ready") { throw "DSH readiness status is not ready: $($readiness.status)" }

Write-Host "`n--- GET /dsh/stores ---"
$stores = Invoke-RestMethod -Uri "http://localhost:58080/dsh/stores" -Method GET -TimeoutSec 10
Write-Host ($stores | ConvertTo-Json -Depth 5)
if ($null -eq $stores.stores) { throw "DSH /stores response missing 'stores' field" }
if ($null -eq $stores.pagination) { throw "DSH /stores response missing 'pagination' field" }

Write-Host "`n--- GET /dsh/stores/store-test-grocery ---"
$store = Invoke-RestMethod -Uri "http://localhost:58080/dsh/stores/store-test-grocery" -Method GET -TimeoutSec 10
Write-Host ($store | ConvertTo-Json -Depth 5)
if ($null -eq $store.store) { throw "DSH /stores/store-test-grocery response missing 'store' field" }
if ($store.store.id -ne "store-test-grocery") { throw "DSH /stores/store-test-grocery returned wrong store id: $($store.store.id)" }

Write-Host "`nDSH runtime smoke: PASS"

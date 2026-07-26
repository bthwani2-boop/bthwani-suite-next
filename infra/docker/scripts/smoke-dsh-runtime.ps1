$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

$ComposeFile = ".\infra\docker\compose.runtime.yml"
$EnvFile     = ".\infra\docker\env\runtime.env.example"
$DshBaseUrl  = "http://localhost:58080"

Write-Host "=== DSH runtime smoke ==="

Write-Host "`n--- docker ps (dsh profile) ---"
docker compose --env-file $EnvFile -f $ComposeFile --profile dsh ps

Write-Host "`n--- GET /dsh/health ---"
$health = Invoke-RestMethod -Uri "$DshBaseUrl/dsh/health" -Method GET -TimeoutSec 10
Write-Host ($health | ConvertTo-Json -Depth 5)
if ($health.status -ne "healthy") { throw "DSH health status is not healthy: $($health.status)" }

Write-Host "`n--- GET /dsh/readiness ---"
$readiness = Invoke-RestMethod -Uri "$DshBaseUrl/dsh/readiness" -Method GET -TimeoutSec 10
Write-Host ($readiness | ConvertTo-Json -Depth 5)
if ($readiness.status -ne "ready") { throw "DSH readiness status is not ready: $($readiness.status)" }

Write-Host "`n--- GET /dsh/stores ---"
$stores = Invoke-RestMethod -Uri "$DshBaseUrl/dsh/stores" -Method GET -TimeoutSec 10
Write-Host ($stores | ConvertTo-Json -Depth 5)
if ($null -eq $stores.stores) { throw "DSH /stores response missing 'stores' field" }
if ($null -eq $stores.pagination) { throw "DSH /stores response missing 'pagination' field" }

Write-Host "`n--- GET /dsh/home-discovery and verify every published storefront ---"
$home = Invoke-RestMethod -Uri "$DshBaseUrl/dsh/home-discovery?limit=50" -Method GET -TimeoutSec 15
if ($null -eq $home.stores) { throw "DSH /home-discovery response missing 'stores' field" }
$homeStores = @($home.stores)
if ($homeStores.Count -lt 1) { throw "DSH /home-discovery returned no published stores" }

foreach ($homeStore in $homeStores) {
  $storeId = [string]$homeStore.id
  if ([string]::IsNullOrWhiteSpace($storeId)) {
    throw "DSH /home-discovery returned a store without an id"
  }

  $encodedStoreId = [uri]::EscapeDataString($storeId)

  Write-Host "`n--- GET /dsh/stores/$storeId ---"
  $detail = Invoke-RestMethod -Uri "$DshBaseUrl/dsh/stores/$encodedStoreId" -Method GET -TimeoutSec 10
  if ($null -eq $detail.store) {
    throw "DSH store detail response missing 'store' for $storeId"
  }
  if ([string]$detail.store.id -ne $storeId) {
    throw "DSH store detail returned wrong id for $storeId: $($detail.store.id)"
  }

  Write-Host "--- GET /dsh/stores/$storeId/catalog ---"
  $catalog = Invoke-RestMethod -Uri "$DshBaseUrl/dsh/stores/$encodedStoreId/catalog" -Method GET -TimeoutSec 15
  if ($null -eq $catalog.products) {
    throw "DSH public catalog response missing 'products' for $storeId"
  }
  if (@($catalog.products).Count -lt 1) {
    throw "DSH public catalog contains no client-visible products for $storeId"
  }
}

Write-Host "`nDSH runtime smoke: PASS"

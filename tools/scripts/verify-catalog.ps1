$ErrorActionPreference = "Stop"

Write-Host "=== verify-catalog ==="

$ApiBase = "http://localhost:58080"

function Resolve-PublicMediaUrl {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -match "^https?://") {
        return $Value
    }
    if (-not $Value.StartsWith("/")) {
        throw "Catalog image URL must be absolute or root-relative: $Value"
    }
    return "$ApiBase$Value"
}

# 1. Check Home Discovery
Write-Host "Checking Home Discovery..."
$homeDisc = Invoke-RestMethod "$ApiBase/dsh/home-discovery" -TimeoutSec 10
if (-not $homeDisc.stores -or $homeDisc.stores.Count -eq 0) { throw "Home discovery returned 0 stores" }
if (-not $homeDisc.categories -or $homeDisc.categories.Count -eq 0) { throw "Home discovery returned 0 categories" }

$storeCount = $homeDisc.stores.Count
Write-Host "Found $storeCount stores in discovery."

# 2. Check each store and its public catalog
foreach ($store in $homeDisc.stores) {
    Write-Host "Checking store $($store.id)..."

    $storeDetails = Invoke-RestMethod "$ApiBase/dsh/stores/$($store.id)" -TimeoutSec 10
    if ($storeDetails.store.id -ne $store.id) { throw "Store details ID mismatch for $($store.id)" }

    if ([string]::IsNullOrWhiteSpace($storeDetails.store.logoUrl)) { throw "Store $($store.id) missing logoUrl" }
    if ([string]::IsNullOrWhiteSpace($storeDetails.store.heroImageUrl)) { throw "Store $($store.id) missing heroImageUrl" }

    $catalog = Invoke-RestMethod "$ApiBase/dsh/stores/$($store.id)/catalog" -TimeoutSec 10
    if (-not $catalog.products -or $catalog.products.Count -eq 0) { throw "Store $($store.id) has no published products" }

    $productCount = $catalog.products.Count
    Write-Host "  Store $($store.id) has $productCount products."

    # DshClientCatalogProduct owns `id` and the DAM-computed
    # `effectiveImage.url`. Legacy masterProductId/effectiveImageUrl aliases are
    # intentionally not accepted here because they are not part of OpenAPI.
    foreach ($product in $catalog.products) {
        if ([string]::IsNullOrWhiteSpace($product.id)) {
            throw "Catalog product in store $($store.id) is missing canonical id"
        }
        if ($null -eq $product.effectiveImage -or [string]::IsNullOrWhiteSpace($product.effectiveImage.url)) {
            throw "Product $($product.id) in store $($store.id) missing effectiveImage.url"
        }

        $imageUrl = Resolve-PublicMediaUrl -Value $product.effectiveImage.url
        try {
            $imageResponse = Invoke-WebRequest $imageUrl -Method Get -TimeoutSec 10
            if ($imageResponse.StatusCode -lt 200 -or $imageResponse.StatusCode -ge 300) {
                throw "unexpected HTTP status $($imageResponse.StatusCode)"
            }
            $contentType = [string]$imageResponse.Headers["Content-Type"]
            if (-not $contentType.StartsWith("image/", [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "unexpected content type '$contentType'"
            }
        } catch {
            throw "Product $($product.id) image unreachable at $imageUrl`: $($_.Exception.Message)"
        }
    }
}

Write-Host "All public catalog endpoints, stores, products, and images verified successfully."
Write-Host "verify-catalog: PASS"

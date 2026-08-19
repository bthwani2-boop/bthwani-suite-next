param(
    [switch]$RequireMedia
)

$ErrorActionPreference = "Stop"

$mode = if ($RequireMedia) { "media-overlay" } else { "core" }
Write-Host "=== verify-catalog mode=$mode ==="

$ApiBase = "http://localhost:58080"

function Resolve-PublicMediaUrl {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -match "^https?://") { return $Value }
    if (-not $Value.StartsWith("/")) {
        throw "Catalog image URL must be absolute or root-relative: $Value"
    }
    return "$ApiBase$Value"
}

function Assert-ImageReachable {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $imageUrl = Resolve-PublicMediaUrl -Value $Value
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
        throw "$Label image unreachable at $imageUrl`: $($_.Exception.Message)"
    }
}

Write-Host "Checking Home Discovery..."
$homeDisc = Invoke-RestMethod "$ApiBase/dsh/home-discovery" -TimeoutSec 10
if (-not $homeDisc.stores -or $homeDisc.stores.Count -eq 0) { throw "Home discovery returned 0 stores" }
if (-not $homeDisc.categories -or $homeDisc.categories.Count -eq 0) { throw "Home discovery returned 0 categories" }

$storeCount = $homeDisc.stores.Count
Write-Host "Found $storeCount stores in discovery."

foreach ($store in $homeDisc.stores) {
    Write-Host "Checking store $($store.id)..."

    $storeDetails = Invoke-RestMethod "$ApiBase/dsh/stores/$($store.id)" -TimeoutSec 10
    if ($storeDetails.store.id -ne $store.id) { throw "Store details ID mismatch for $($store.id)" }

    $logoUrl = [string]$storeDetails.store.logoUrl
    $heroUrl = [string]$storeDetails.store.heroImageUrl
    if ($RequireMedia) {
        if ([string]::IsNullOrWhiteSpace($logoUrl)) { throw "Store $($store.id) missing logoUrl in media-overlay mode" }
        if ([string]::IsNullOrWhiteSpace($heroUrl)) { throw "Store $($store.id) missing heroImageUrl in media-overlay mode" }
        Assert-ImageReachable -Value $logoUrl -Label "Store $($store.id) logo"
        Assert-ImageReachable -Value $heroUrl -Label "Store $($store.id) hero"
    } else {
        if (-not [string]::IsNullOrWhiteSpace($logoUrl) -or -not [string]::IsNullOrWhiteSpace($heroUrl)) {
            throw "Core catalog proof found local-media store projections without the media capability: store=$($store.id)"
        }
    }

    $catalog = Invoke-RestMethod "$ApiBase/dsh/stores/$($store.id)/catalog" -TimeoutSec 10
    if (-not $catalog.products -or $catalog.products.Count -eq 0) { throw "Store $($store.id) has no published products" }

    $productCount = $catalog.products.Count
    Write-Host "  Store $($store.id) has $productCount products."

    foreach ($product in $catalog.products) {
        if ([string]::IsNullOrWhiteSpace($product.id)) {
            throw "Catalog product in store $($store.id) is missing canonical id"
        }

        if ($RequireMedia) {
            if ($null -eq $product.effectiveImage -or [string]::IsNullOrWhiteSpace($product.effectiveImage.url)) {
                throw "Product $($product.id) in store $($store.id) missing effectiveImage.url in media-overlay mode"
            }
            Assert-ImageReachable -Value ([string]$product.effectiveImage.url) -Label "Product $($product.id)"
        } elseif ($null -ne $product.effectiveImage) {
            throw "Core catalog proof found a local-media effectiveImage without the media capability: product=$($product.id) store=$($store.id)"
        }
    }
}

Write-Host "Catalog core and selected media capability verified successfully."
Write-Host "verify-catalog: PASS mode=$mode"

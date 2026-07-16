$ErrorActionPreference = "Stop"

Write-Host "=== verify-catalog ==="

# Define the base API URL
$ApiBase = "http://localhost:58080"

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
    
    # Store Details
    $storeDetails = Invoke-RestMethod "$ApiBase/dsh/stores/$($store.id)" -TimeoutSec 10
    if ($storeDetails.store.id -ne $store.id) { throw "Store details ID mismatch for $($store.id)" }

    # Validate Store Images
    if ([string]::IsNullOrWhiteSpace($storeDetails.store.logoUrl)) { throw "Store $($store.id) missing logoUrl" }
    if ([string]::IsNullOrWhiteSpace($storeDetails.store.heroUrl)) { throw "Store $($store.id) missing heroUrl" }

    # Store Catalog
    $catalog = Invoke-RestMethod "$ApiBase/dsh/stores/$($store.id)/catalog" -TimeoutSec 10
    if (-not $catalog.products -or $catalog.products.Count -eq 0) { throw "Store $($store.id) has no published products" }
    
    $productCount = $catalog.products.Count
    Write-Host "  Store $($store.id) has $productCount products."

    # Validate Product Images
    foreach ($product in $catalog.products) {
        if ([string]::IsNullOrWhiteSpace($product.effectiveImageUrl)) { throw "Product $($product.masterProductId) in store $($store.id) missing effectiveImageUrl" }
        
        # Optionally, could do a HEAD request to check if the image URL is reachable
        # But maybe we just check if it's absolute URL or valid relative.
        $imgUrl = $product.effectiveImageUrl
        if ($imgUrl -match "^http") {
             # We can verify it exists
             try {
                Invoke-WebRequest $imgUrl -Method Head -TimeoutSec 5 | Out-Null
             } catch {
                throw "Product $($product.masterProductId) image unreachable: $imgUrl"
             }
        }
    }
}

Write-Host "All public catalog endpoints, stores, products, and images verified successfully."
Write-Host "verify-catalog: PASS"

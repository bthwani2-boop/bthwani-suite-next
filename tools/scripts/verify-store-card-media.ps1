# Verify that every store returned by Home Discovery has a reachable hero image
# and logo served through the DSH public media route.

[CmdletBinding()]
param(
    [string] $BaseUrl = "http://localhost:58080"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-MediaUrl {
    param(
        [Parameter(Mandatory)][string] $Raw,
        [Parameter(Mandatory)][string] $Origin
    )

    $value = $Raw.Trim()
    if ($value -match '^https?://') {
        return $value
    }

    $originUri = [Uri]::new($Origin.TrimEnd('/') + '/')
    return [Uri]::new($originUri, $value.TrimStart('/')).AbsoluteUri
}

function Test-ImageUrl {
    param(
        [Parameter(Mandatory)][string] $Url,
        [Parameter(Mandatory)][string] $StoreId,
        [Parameter(Mandatory)][ValidateSet('hero', 'logo')][string] $Role
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 20
        $contentType = [string]$response.Headers['Content-Type']
        $length = if ($null -ne $response.RawContentLength) { [int64]$response.RawContentLength } else { 0 }

        if ($response.StatusCode -ne 200) {
            throw "HTTP $($response.StatusCode)"
        }
        if (-not $contentType.StartsWith('image/', [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "unexpected Content-Type '$contentType'"
        }
        if ($length -le 0) {
            throw "empty response body"
        }

        return [pscustomobject]@{
            StoreId = $StoreId
            Role = $Role
            Url = $Url
            Status = 'PASS'
            ContentType = $contentType
            Bytes = $length
            Error = ''
        }
    } catch {
        return [pscustomobject]@{
            StoreId = $StoreId
            Role = $Role
            Url = $Url
            Status = 'FAIL'
            ContentType = ''
            Bytes = 0
            Error = $_.Exception.Message
        }
    }
}

$normalizedBaseUrl = $BaseUrl.TrimEnd('/')
Write-Host "=== Store Card Media Verification ===" -ForegroundColor Cyan
Write-Host "DSH API: $normalizedBaseUrl"

$homeDiscoveryResponse = Invoke-RestMethod -Uri "$normalizedBaseUrl/dsh/home-discovery" -Method Get -TimeoutSec 20
$stores = @($homeDiscoveryResponse.stores)

if ($stores.Count -eq 0) {
    throw "Home Discovery returned no stores. Run the DSH local seed before verifying media."
}

$results = [System.Collections.Generic.List[object]]::new()

foreach ($store in $stores) {
    $storeId = [string]$store.id
    foreach ($media in @(
        @{ Role = 'hero'; Value = [string]$store.heroImageUrl },
        @{ Role = 'logo'; Value = [string]$store.logoUrl }
    )) {
        if ([string]::IsNullOrWhiteSpace($media.Value)) {
            $results.Add([pscustomobject]@{
                StoreId = $storeId
                Role = $media.Role
                Url = ''
                Status = 'FAIL'
                ContentType = ''
                Bytes = 0
                Error = 'media URL is empty'
            })
            continue
        }

        $resolved = Resolve-MediaUrl -Raw $media.Value -Origin $normalizedBaseUrl
        $results.Add((Test-ImageUrl -Url $resolved -StoreId $storeId -Role $media.Role))
    }
}

$results | Format-Table StoreId, Role, Status, ContentType, Bytes, Url -AutoSize

$failed = @($results | Where-Object Status -eq 'FAIL')
if ($failed.Count -gt 0) {
    Write-Host "`nFailures:" -ForegroundColor Red
    $failed | Format-List StoreId, Role, Url, Error
    throw "Store card media verification failed for $($failed.Count) media object(s). Run pnpm runtime:seed followed by pnpm runtime:bootstrap-dev, then rerun this verifier."
}

Write-Host "`nStore card media verification: PASS ($($results.Count) objects)" -ForegroundColor Green

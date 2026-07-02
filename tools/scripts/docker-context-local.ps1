param()

$ErrorActionPreference = "Stop"

docker context use default
if ($LASTEXITCODE -ne 0) { throw "docker context use default failed" }

Write-Host "Docker context restored to default."

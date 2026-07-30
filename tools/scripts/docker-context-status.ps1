param()

$ErrorActionPreference = "Stop"

docker context ls
if ($LASTEXITCODE -ne 0) { throw "docker context ls failed" }

Write-Host "`n--- Active Docker context ---"
docker context show
if ($LASTEXITCODE -ne 0) { throw "docker context show failed" }

Write-Host "`n--- Docker info ---"
docker info --format "Context={{.Name}} ServerVersion={{.ServerVersion}} OperatingSystem={{.OperatingSystem}}"
if ($LASTEXITCODE -ne 0) { throw "docker info failed" }

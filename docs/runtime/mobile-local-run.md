<!-- ALLOW_LOCAL_PATH_EXAMPLE -->
# تشغيل تطبيقات الهاتف محلياً (Mobile Local Run)

الأوامر البرمجية التالية تقوم بالانتقال التلقائي لمسار المشروع وتجلب الـ IP الفعلي للإنترنت/الراوتر تلقائياً:

### 1️⃣ تشغيل تطبيق العميل (app-client)
```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-client/runtime exec expo start --dev-client --host lan --port 18101 --android --clear
```

### 2️⃣ تشغيل تطبيق الشركاء (app-partner)
```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_DEV_STORE_ID = try { (Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue).stores[0].id } catch { "store-1005" }
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-partner/runtime exec expo start --dev-client --host lan --port 18102 --android --clear
```

### 3️⃣ تشغيل تطبيق الكابتن والتوصيل (app-captain)
```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_DEV_STORE_ID = try { (Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue).stores[0].id } catch { "store-1005" }
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-captain/runtime exec expo start --dev-client --host lan --port 18103 --android --clear
```

### 4️⃣ تشغيل تطبيق العمليات الميدانية (app-field)
```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Get-NetIPInterface | Get-NetIPAddress -AddressFamily IPv4 | Select-Object -First 1).IPAddress
$env:EXPO_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://127.0.0.1:58080"
$env:EXPO_PUBLIC_DEV_STORE_ID = try { (Invoke-RestMethod "http://127.0.0.1:58080/dsh/stores?limit=1&offset=0" -TimeoutSec 3 -ErrorAction SilentlyContinue).stores[0].id } catch { "store-1005" }
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:58080 tcp:58080
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:59000 tcp:59000
pnpm --dir apps/app-field/runtime exec expo start --dev-client --host lan --port 18104 --android --clear
```

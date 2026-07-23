# Scanner execution diagnostics

- OSV exit: 1
- Trivy exit: 0

## OSV stderr
```text
Scanning dir .
Starting filesystem walk for root: /
Scanned /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/go.mod file and found 24 packages
Scanned /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/wlt/backend/go.mod file and found 2 packages
Scanned /home/runner/work/bthwani-suite-next/bthwani-suite-next/core/platform-control/backend/go.mod file and found 2 packages
Scanned /home/runner/work/bthwani-suite-next/bthwani-suite-next/core/workforce/backend/go.mod file and found 2 packages
Scanned /home/runner/work/bthwani-suite-next/bthwani-suite-next/core/providers/backend/go.mod file and found 2 packages
Scanned /home/runner/work/bthwani-suite-next/bthwani-suite-next/core/identity/backend/go.mod file and found 3 packages
Scanned /home/runner/work/bthwani-suite-next/bthwani-suite-next/pnpm-lock.yaml file and found 1472 packages
End status: 645 dirs visited, 4530 inodes visited, 7 Extract calls, 293.793352ms elapsed, 293.793702ms wall time
```

## Trivy stderr
```text
2026-07-23T19:07:52Z	INFO	Loaded	file_path="trivy.yaml"
2026-07-23T19:07:52Z	INFO	[vulndb] Need to update DB
2026-07-23T19:07:52Z	INFO	[vulndb] Downloading vulnerability DB...
2026-07-23T19:07:52Z	INFO	[vulndb] Downloading artifact...	repo="mirror.gcr.io/aquasec/trivy-db:2"
36.05 MiB / 101.77 MiB [--------------------->______________________________________] 35.42% ? p/s ?73.74 MiB / 101.77 MiB [------------------------------------------->________________] 72.45% ? p/s ?101.77 MiB / 101.77 MiB [--------------------------------------------------------->] 100.00% ? p/s ?101.77 MiB / 101.77 MiB [------------------------------------------->] 100.00% 109.39 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [------------------------------------------->] 100.00% 109.39 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [------------------------------------------->] 100.00% 109.39 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [------------------------------------------->] 100.00% 102.33 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [------------------------------------------->] 100.00% 102.33 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [------------------------------------------->] 100.00% 102.33 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 95.73 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 95.73 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 95.73 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 89.55 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 89.55 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 89.55 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 83.78 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-------------------------------------------->] 100.00% 83.78 MiB p/s ETA 0s101.77 MiB / 101.77 MiB [-----------------------------------------------] 100.00% 30.42 MiB p/s 3.5s2026-07-23T19:07:57Z	INFO	[vulndb] Artifact successfully downloaded	repo="mirror.gcr.io/aquasec/trivy-db:2"
2026-07-23T19:07:57Z	INFO	[vuln] Vulnerability scanning is enabled
2026-07-23T19:07:57Z	INFO	[secret] Secret scanning is enabled
2026-07-23T19:07:57Z	INFO	[secret] If your scanning is slow, please try '--scanners vuln' to disable secret scanning
2026-07-23T19:07:57Z	INFO	[secret] Please see https://trivy.dev/docs/v0.70/guide/scanner/secret#recommendation for faster secret detection
2026-07-23T19:07:58Z	INFO	[pnpm] To collect the license information of packages, "pnpm install" needs to be performed beforehand	dir="node_modules"
2026-07-23T19:07:58Z	INFO	Suppressing dependencies for development and testing. To display them, try the '--include-dev-deps' flag.
2026-07-23T19:07:58Z	INFO	Number of language-specific files	num=7
2026-07-23T19:07:58Z	INFO	[gomod] Detecting vulnerabilities...
2026-07-23T19:07:58Z	INFO	[pnpm] Detecting vulnerabilities...
2026-07-23T19:07:58Z	WARN	Using severities from other vendors for some vulnerabilities. Read https://trivy.dev/docs/v0.70/guide/scanner/vulnerability#severity-selection for details.

📣 [34mNotices:[0m
  - Version 0.72.0 of Trivy is now available, current version is 0.70.0

To suppress version checks, run Trivy scans with the --skip-version-check flag

```

## Trivy stdout
```text
```

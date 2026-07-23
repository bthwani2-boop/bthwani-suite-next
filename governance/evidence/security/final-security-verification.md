# Final security verification

- lockfile install exit: 0
- audit command exit: 1
- frozen install exit: 0
- control-panel typecheck exit: 0
- DSH typecheck exit: 0
- vulnerabilities: {"critical": 0, "high": 0, "info": 0, "low": 0, "moderate": 1}

## lock-install tail
```text
 WARN  Issues with peer dependencies found
.
├─┬ expo-router 56.2.15
│ ├── ✕ unmet peer expo-linking@^56.0.15: found 57.0.3
│ ├── ✕ unmet peer expo-constants@^56.0.21: found 57.0.5
│ └─┬ @testing-library/user-event 14.6.1
│   └── ✕ missing peer @testing-library/dom@>=7.21.4
├─┬ madge 8.0.0
│ └── ✕ unmet peer typescript@^5.4.4: found 6.0.3
└─┬ openapi-typescript 7.13.0
  └── ✕ unmet peer typescript@^5.x: found 6.0.3
Peer dependencies that should be installed:
  @testing-library/dom@>=7.21.4

apps/app-captain/runtime
└─┬ expo-router 56.2.15
  ├── ✕ unmet peer expo-linking@^56.0.15: found 57.0.3
  ├── ✕ unmet peer expo-constants@^56.0.21: found 56.0.20
  └─┬ @testing-library/user-event 14.6.1
    └── ✕ missing peer @testing-library/dom@>=7.21.4
Peer dependencies that should be installed:
  @testing-library/dom@>=7.21.4

apps/app-client/runtime
└─┬ expo-router 56.2.15
  ├── ✕ unmet peer expo-linking@^56.0.15: found 57.0.3
  ├── ✕ unmet peer expo-constants@^56.0.21: found 56.0.20
  └─┬ @testing-library/user-event 14.6.1
    └── ✕ missing peer @testing-library/dom@>=7.21.4
Peer dependencies that should be installed:
  @testing-library/dom@>=7.21.4

apps/app-field/runtime
└─┬ expo-router 56.2.15
  ├── ✕ unmet peer expo-linking@^56.0.15: found 57.0.3
  ├── ✕ unmet peer expo-constants@^56.0.21: found 56.0.20
  └─┬ @testing-library/user-event 14.6.1
    └── ✕ missing peer @testing-library/dom@>=7.21.4
Peer dependencies that should be installed:
  @testing-library/dom@>=7.21.4

apps/app-partner/runtime
└─┬ expo-router 56.2.15
  ├── ✕ unmet peer expo-linking@^56.0.15: found 57.0.3
  ├── ✕ unmet peer expo-constants@^56.0.21: found 56.0.20
  └─┬ @testing-library/user-event 14.6.1
    └── ✕ missing peer @testing-library/dom@>=7.21.4
Peer dependencies that should be installed:
  @testing-library/dom@>=7.21.4

shared/media-runtime
└─┬ expo-router 56.2.15
  ├── ✕ unmet peer expo-linking@^56.0.15: found 57.0.3
  ├── ✕ unmet peer expo-constants@^56.0.21: found 57.0.5
  └─┬ @testing-library/user-event 14.6.1
    └── ✕ missing peer @testing-library/dom@>=7.21.4
Peer dependencies that should be installed:
  @testing-library/dom@>=7.21.4

Done in 14.6s using pnpm v10.34.0
```
## frozen-install tail
```text
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 1355, reused 0, downloaded 30, added 4
Progress: resolved 1355, reused 0, downloaded 155, added 154
Progress: resolved 1355, reused 0, downloaded 304, added 292
Progress: resolved 1355, reused 0, downloaded 379, added 377
Progress: resolved 1355, reused 0, downloaded 461, added 438
Progress: resolved 1355, reused 0, downloaded 567, added 557
Progress: resolved 1355, reused 0, downloaded 610, added 578
Progress: resolved 1355, reused 0, downloaded 622, added 582
Progress: resolved 1355, reused 0, downloaded 660, added 602
Progress: resolved 1355, reused 0, downloaded 737, added 727
Progress: resolved 1355, reused 0, downloaded 743, added 731
Progress: resolved 1355, reused 0, downloaded 820, added 820
Progress: resolved 1355, reused 0, downloaded 1009, added 1010
Progress: resolved 1355, reused 0, downloaded 1116, added 1117
Progress: resolved 1355, reused 0, downloaded 1260, added 1252
Progress: resolved 1355, reused 0, downloaded 1322, added 1311
Progress: resolved 1355, reused 0, downloaded 1354, added 1354
Progress: resolved 1355, reused 0, downloaded 1354, added 1355
Progress: resolved 1355, reused 0, downloaded 1354, added 1355, done
.../node_modules/@sentry/cli postinstall$ node ./scripts/install.js
.../.pnpm/nx@22.3.3/node_modules/nx postinstall$ node ./bin/post-install || exit 0
.../node_modules/@sentry/cli postinstall: Done
.../.pnpm/nx@22.3.3/node_modules/nx postinstall: Done

dependencies:
+ @react-native-async-storage/async-storage 2.2.0
+ @react-native-community/netinfo 12.0.1
+ expo-linking 57.0.3

devDependencies:
+ @ast-grep/cli 0.43.0
+ @axe-core/playwright 4.12.1
+ @ls-lint/ls-lint 2.3.1
+ @opentelemetry/api 1.9.1
+ @opentelemetry/exporter-trace-otlp-http 0.217.0
+ @opentelemetry/resources 1.30.1
+ @opentelemetry/sdk-node 0.217.0
+ @opentelemetry/semantic-conventions 1.41.1
+ @playwright/test 1.61.1
+ @stoplight/spectral-cli 6.16.0
+ @types/react 19.2.17
+ ajv 8.20.0
+ ajv-formats 3.0.1
+ autocannon 8.0.0
+ babel-plugin-react-compiler 1.0.0
+ dependency-cruiser 17.4.3
+ eslint 9.39.1
+ eslint-plugin-react-compiler 19.1.0-rc.2
+ jscpd 5.0.10
+ knip 6.17.1
+ madge 8.0.0
+ markdownlint-cli2 0.23.0
+ nx 22.3.3
+ openapi-typescript 7.13.0
+ sherif 1.11.1
+ size-limit 11.2.0
+ typescript 6.0.3

Done in 22.3s using pnpm v10.34.0
```
## control-typecheck tail
```text

> @bthwani/control-panel@ typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next/apps/control-panel/runtime
> tsc --noEmit -p tsconfig.json

```
## dsh-typecheck tail
```text

> @bthwani/dsh@0.0.0 typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh
> tsc -p tsconfig.json --noEmit

```
## audit stderr
```text
```

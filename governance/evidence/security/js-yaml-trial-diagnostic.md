# JS-YAML trial diagnostics

- install exit: 0
- why exit: 0
- audit exit: 1

## Install tail
```text
Scope: all 26 workspace projects
Progress: resolved 1, reused 0, downloaded 0, added 0
Progress: resolved 35, reused 0, downloaded 0, added 0
Progress: resolved 81, reused 0, downloaded 0, added 0
Progress: resolved 120, reused 0, downloaded 0, added 0
Progress: resolved 231, reused 0, downloaded 0, added 0
Progress: resolved 295, reused 0, downloaded 0, added 0
Progress: resolved 336, reused 0, downloaded 0, added 0
Progress: resolved 540, reused 0, downloaded 0, added 0
Progress: resolved 774, reused 0, downloaded 0, added 0
Progress: resolved 902, reused 0, downloaded 0, added 0
Progress: resolved 1206, reused 0, downloaded 0, added 0
Progress: resolved 1473, reused 0, downloaded 0, added 0
 WARN  4 deprecated subdependencies found: @babel/plugin-proposal-private-methods@7.18.6, glob@7.2.3, inflight@1.0.6, sourcemap-codec@1.4.8
Progress: resolved 1473, reused 0, downloaded 0, added 0, done
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

Done in 13.5s using pnpm v10.34.0
```

## Why stderr
```text
```

## Audit stderr
```text
```

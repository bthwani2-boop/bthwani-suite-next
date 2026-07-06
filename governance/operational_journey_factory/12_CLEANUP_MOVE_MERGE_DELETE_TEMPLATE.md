# Cleanup Move Merge Delete Template

<!-- markdownlint-disable MD060 -->

Cleanup is part of journey readiness. No file, export, helper, route, shared controller, adapter, generated binding, or duplicate truth may remain unclassified.

| Field | Required value |
|---|---|
| target | File, symbol, folder, export, route, screen, helper, generated binding, or config |
| decision | keep, bind, move, merge, split, delete_after_proof, retire |
| proof before delete | Imports, exports, routes, navigation, runtime-map, service.manifest, capability-map, generated clients, tests, and CI/guards |
| proof before move | Import resolution, ownership, runtime, tests, and affected validation |
| proof before merge | Duplication proof, shared owner, consumers, and post-merge verification |
| consumers | Direct and indirect consumers |
| runtime references | Runtime map, app entry, backend boot, or CI reference |
| CI references | Workflow or guard references |
| generated references | Generated clients or generated source links |
| route references | Frontend, backend, navigation, deep link |
| test references | Existing and required checks |
| risk | Low, focused, standard, high |
| verification | Smallest sufficient command |
| rollback plan | How to restore or block if verification fails |

Delete is never allowed without proof across all required reference sources.

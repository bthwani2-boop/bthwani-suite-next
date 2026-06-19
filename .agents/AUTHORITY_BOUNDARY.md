# Authority Boundary

## Agent authority

Agents may inspect, propose, generate narrow patches, and execute local edits only inside the requested scope.

## Not agent authority

Agents must not independently:

- decide architecture beyond governance
- widen scope
- copy donor files wholesale
- delete/move/rename files without explicit approval
- change dependencies or lockfiles without explicit approval
- run heavy gates without task justification
- write to GitHub unless the user explicitly requests it
- claim final acceptance without evidence

## Truth order

1. Current user instruction
2. Current repo evidence
3. `governance/*`
4. `machine-readable/*`
5. `.agents/*`
6. donor/realtest only as reference
7. assumptions marked `UNPROVEN`

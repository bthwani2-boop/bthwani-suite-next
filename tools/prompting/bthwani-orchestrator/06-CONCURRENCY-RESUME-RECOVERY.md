# 06 — Concurrency, Resume & Recovery

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/06-CONCURRENCY-RESUME-RECOVERY.md`

## 1) القاعدة العامة

```text
PARALLELISM IS GRAPH-PROVEN, NOT AGENT-COUNT-DRIVEN.
ONE WRITING OWNER PER CONFLICT DOMAIN.
MULTIPLE INDEPENDENT EXECUTION FRONTS MAY RUN IN ISOLATION.
ONE TARGET-BRANCH INTEGRATION OWNER AT A TIME.
LATEST REMOTE HEAD GOVERNS EVERY INTEGRATION/PUSH.
```

## 2) Agent Topology

- Orchestrator role: graph/accounting/dedup/root-cause correlation/assignment/gates.
- Discovery/diagnosis workers: parallel scoped probes.
- Execution workers: independent conflict domains only.
- Verification/adversarial workers: challenge claims and hidden/missed paths.
- Integration owner: sole target-branch mutation/integration owner at a time.

كل agent assignment يسجل: mission, graph scope, input SHA, read/write authority, conflict domain, expected output, handoff, invalidation trigger.

## 3) Isolated Workspace

```text
ONE WRITING AGENT = ONE ISOLATED WORKTREE/CLONE/WORKSPACE
```

Inventory tracked/untracked state + intended owned paths/symbols/hunks. Path ownership وحده لا يثبت semantic independence.

## 4) Continuous Latest-Head Reconciliation

قبل sequence creation / semantic write / integration / commit / push / final decision:

```text
resolve LATEST_REMOTE_SHA
→ compare WORK_BASE_SHA → LATEST_REMOTE_SHA
→ inspect paths/symbols/contracts/schema/migrations/generated/truth owners
→ classify semantic delta
```

```text
DISJOINT
→ adopt latest head automatically; keep valid evidence.

RELATED_NON_CONFLICTING
→ reconcile affected assumptions/checks only.

SEMANTIC_OVERLAP
→ suspend only affected graph node/frontier
→ re-diagnose/rebuild on latest head.

DIRECT_CONFLICT
→ block only conflicting conflict-domain integration
→ independent frontiers continue.

AUTHORITY_OR_TRUTH_CHANGE
→ invalidate affected model/evidence
→ reread authority/Product Truth/contracts before write.
```

Git textual mergeability لا يساوي semantic safety.

## 5) Integration / Push Serialization

```text
workers produce scoped deltas/evidence
→ integration owner fetches latest head
→ classifies concurrent movement
→ rebases/rebuilds semantically on latest head
→ reruns invalidated checks
→ candidate parent = latest reconciled head
→ re-resolve immediately before ref update
→ fast-forward-safe non-force update
→ re-resolve after push
```

لا stale push ولا force push.

## 6) Atomic GitHub/API Writes

لـmulti-file logical write:

```text
latest head → blobs → tree on exact base tree → commit exact parent
→ re-resolve ref → non-force fast-forward update
```

إذا تحرك الفرع قبل update_ref: لا Force؛ rebuild commit on latest head.

## 7) Parallel Frontier Safety

قبل parallel live writes أثبت استقلال Conflict Domains عبر:

```text
canonical owner / shared state / contracts / DB-migration chain
shared generated outputs / runtime authority / same symbols/hunks / governance owner
```

إذا الاستقلال غير مثبت → SERIAL_REQUIRED.

لا Agentين يكتبان لنفس semantic owner/conflict domain بالتوازي.

## 8) Structured Backtracking / Suspension

عند اكتشاف upstream dependency:

```text
current sequence = SUSPENDED_BY_DEPENDENCY
→ record SUSPENDED_BY / RESUME_AFTER
→ open upstream dependency JIT
→ work/verify upstream
→ mark affected descendant evidence stale
→ resume/reopen descendant
→ re-diagnose before write
```

وجود عدة suspended/reopened sequences مسموح؛ الفوضى التنفيذية غير مسموحة.

## 9) Resume Semantics

```text
recover task identity/package
recover graph/frontier/suspension/reopen state
recover still-valid findings/decisions/evidence
re-resolve remote head
classify drift
resume exact invalidated node/gate
```

لا restart from zero بلا سبب ولا preserve stale evidence لتوفير الوقت.

## 10) Foreign Change Discipline

foreign/pre-existing change ≠ task change. لا reset/clean/overwrite foreign work. Integration Owner يحمل التغيير فوق latest head إذا DISJOINT، ويعيد التشخيص فقط للمساحة المتأثرة إذا overlap.

## 11) Evidence Preservation / Invalidation Cone

لكل branch movement أو upstream fix:

```text
identify affected graph cone
→ retain proven-unrelated evidence
→ stale only affected evidence
→ rerun minimum sufficient set unless policy/risk requires broader proof
```

## 12) Partial Failure

partial write/integration ≠ DONE. افحص remote tree، classify committed/missing pieces، ثم complete coherently on latest head أو repair/revert intentionally when authorized.

## 13) Exact Resume Point

```text
TASK_ID
BRANCH
LATEST_OBSERVED_SHA
ACTIVE_EXECUTION_FRONTIER
SUSPENDED/REOPENED_SEQUENCES
INTEGRATION_OWNER
LAST_PASSED_GATE
OPEN_FINDINGS/DECISIONS/SCOPE_DELTAS/BLOCKERS
INVALIDATED_EVIDENCE
NEXT_GRAPH_ACTION
```

الهدف أن يتابع أي وكيل من الحقيقة المسجلة لا من ذاكرة الجلسة.

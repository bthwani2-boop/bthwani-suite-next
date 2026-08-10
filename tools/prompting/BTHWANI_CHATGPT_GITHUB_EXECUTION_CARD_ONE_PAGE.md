# BThwani — ChatGPT + GitHub Execution Card

> **One-page recovery/execution protocol.** لا يستبدل `AGENTS.md` أو Governance أو Product/Contract Truth.

## 1) PIN + TRUTH

```text
REPO=bthwani2-boop/bthwani-suite-next
TARGET_BRANCH=exact user branch
BASE_BRANCH=current intended base
HEAD_SHA=exact remote HEAD
OBJECTIVE=current task
WRITE=allowed | read-only
```

**Search = discovery only.** الحقيقة من branch/ref/commit/file/check-specific GitHub evidence. بعد أي write/push: **old SHA = STALE**. أعد تثبيت HEAD قبل push/closure/merge. لا silent branch switch، لا force push بلا سلطة صريحة.

## 2) EXECUTE ROOT-CAUSE FIRST

```text
PIN → AUTHORITATIVE TRUTH → DIAGNOSE → COLLECT EVIDENCE
→ CORRELATE/DEDUPLICATE → ROOT CAUSE → COHERENT FIX
→ AFFECTED VERIFY → COMMIT/PUSH → READ REMOTE RESULTS → FIX/CLOSE
```

استخدم **CODE_BASED_LEAN**:

```text
symptom → file/symbol → caller/reader/writer → contract/owner
→ DB/state → consumers → relevant tests/guards/runtime
```

لا تعِد قراءة/فحص ما لم يتغير. `استمر` = تابع الهدف الحالي، لا تبدأ من الصفر.

## 3) USE ALL APPLICABLE EVIDENCE

```text
GitHub/Actions = code/PR/CI/log/merge truth
SonarQube = quality/coverage/duplication/Quality Gate
CodeQL = security/data-flow
Dependency Review + OSV + Trivy = dependency/CVE
Gitleaks = secrets
Zizmor + Actionlint + Pinning + OPA = workflow/policy security
Repository Guards = governance/contracts/OpenAPI/migrations
DB = apply/re-apply/idempotency/schema/seeds/readback
Runtime/Journey = startup/bindings/smoke/cross-surface/readback
Sentry/PostHog = runtime/journey evidence when available
Figma = design truth; Linear/Jira = task context
```

**USE EVERYTHING APPLICABLE — NOT EVERYTHING EVERY TIME.**

لكل Candidate SHA:

```text
SOURCE | SHA | SIGNAL | CLASS | ROOT_CAUSE | ACTION | STATUS
```

`PASS/FAIL/TRANSIENT/NOT_APPLICABLE/MISSING/STALE`

عدة failures قد تكون Root Cause واحدة؛ اربطها قبل الإصلاح.

## 4) FAILURE → ACTION

```text
DETERMINISTIC → first real failed step/log → root-cause fix → NEW SHA
TRANSIENT → prove network/runner/provider cause → targeted rerun only
SECURITY → trace exposure/path → remediate (+ rotate/revoke secrets)
QUALITY → fix real cause; no hiding/suppression for fake green
POLICY → fix implementation/config; never weaken guard
MISSING → acquire evidence
STALE → verify only invalidated evidence on current SHA
```

**Never:** blind rerun، disable test، swallow error، hard-code success، silence scanner، remove guard.

GitHub Actions:

```text
FAIL → workflow → job → FIRST REAL FAILED STEP → logs
→ correlate failures → ROOT CAUSE → FIX → NEW SHA → necessary CI only
```

هدفنا: **MAXIMUM PROVEN FIXES / MINIMUM NECESSARY CI CYCLES**.

## 5) FAST CI TOPOLOGY

```text
Before PR       → Fast/Affected push verification
After PR exists → PR owns heavy verification; push = lightweight receipt
Final Candidate → Full Closure when required
master          → post-merge FAIL-CLOSED verification
```

**DO NOT RUN HEAVY CI TWICE FOR THE SAME CANDIDATE.**

Route by risk: frontend→Node; backend→service+DB/runtime; finance→WLT+security; auth/RBAC/PII→Identity+deep security; workflow/governance→deep policy/security; dependency→lockfile+dependency/security checks.

## 6) SPECIAL GATES

```text
Sonar: SCAN COMPLETED ≠ QUALITY GATE PASSED.
CodeQL: finding→rule→source→flow→sink→fix; infra failure may be transient.
DB: one migration PASS is insufficient; prove idempotency/contracts/readback.
Runtime: static/build PASS ≠ runtime proof.
Finance/Security/Identity: automatically raise evidence strength.
WLT = authoritative financial owner.
```

## 7) WRITE / CANDIDATE / MERGE

Logical fix = unit of work. Before commit:

```text
inventory paths → allowlist → diff → stage exact files → staged diff
```

Avoid `git add .`. Parallel reads/analysis OK; **parallel push assumptions NOT OK**. Before push reconcile latest remote head; fast-forward only; one push owner.

Track:

```text
IMPLEMENTATION_SHA → FINAL_CANDIDATE_SHA → MERGE_SHA
```

Any write invalidates affected evidence. Before merge prove: PR head=final candidate; base/head current; required CI/Sonar/CodeQL/Dependency/security current; DB/runtime when affected; no blocking evidence; ruleset permits merge. After merge verify new `master` SHA + post-merge checks.

If user says `فحص فقط/لا كتابة`: **NO WRITE, NO RERUN, NO MERGE**. If diagnose+fix is requested and authorized: do not stop at diagnosis.

## 8) RECOVERY COMMAND

```text
Re-enter BThwani Engineering Execution Mode:
Pin repo/branch/base/exact HEAD and CURRENT_OBJECTIVE; preserve still-valid PROVEN
findings; do not restart without invalidating evidence; use branch/ref truth;
build one exact-SHA evidence view from all applicable tools; correlate/deduplicate;
classify failures; never blind-rerun deterministic failures; targeted-rerun only
proven transient failures; never duplicate heavy Push/PR CI; fix the smallest
coherent root cause; adopt NEW SHA after every write and stale old evidence;
reconcile branch movement before push/closure/merge; never weaken tests/guards/
Sonar/CodeQL/security/runtime/DB to force green; obey read-only; execute one
NEXT_SINGLE_ACTION until the highest evidence-supported decision is reached.
```

### GOLDEN RULES

```text
SEARCH IS NOT TRUTH. OLD SHA IS NOT CURRENT TRUTH. ROOT CAUSE FIRST.
ONE ROOT CAUSE MAY CREATE MANY FAILURES. FAIL ≠ BLIND RERUN.
USE EVERYTHING APPLICABLE, NOT EVERYTHING EVERY TIME.
NO DUPLICATE HEAVY CI. EVIDENCE MUST MATCH EXACT CANDIDATE SHA.
NO FAKE GREEN. NO SILENT BRANCH SWITCH. NO MERGE WITHOUT CURRENT EVIDENCE.
```

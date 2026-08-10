# U002 — identity-workforce-access

## Objective

Prove and, only where evidence fails, repair the single Captain authentication → Workforce → readiness → runtime-entry path on current `BB`.

## Current diagnosis

The old package correctly identified Identity/Workforce as authoritative owners, but its implementation assumptions predate current `BB`. `apps/app-captain/runtime/src/App.tsx` now configures SecureStore session storage and a stable device fingerprint, requires role `captain` and surface `app-captain`, requires Workforce kind `captain`, fetches authoritative readiness, and blocks when eligibility is unavailable. `captain-readiness.policy.ts` explicitly classifies `loading`, `blocked`, `allowed`, and `unknown`.

Current app-captain package scripts also run real Node tests plus the mobile runtime contract. Therefore the root task is not to add another readiness gate. It is to prove the full backend lifecycle: Captain provisioning/activation identity linkage, suspended/missing/wrong-role denial, readiness reasons, restart/refresh behavior, session logout/relogin isolation, device/push rebinding, and failure behavior when Identity/Workforce is unavailable.

The current branch baseline `0916eb2500a0f6d83c47ed44124c02665f9cd0f9` includes the forward-compatible Identity historical migration digest amendment from `de34ec33ff9ee52d0228a340453272d4e03ba7b1`. It also includes the shared mobile LAN gateway root-cause repair at `086e48f8f8ed9deaa9d1525f379505af056df355`, which removed a PowerShell `$Pid` collision that prevented the development gateway from starting and added executable regression coverage. U002 must preserve both as current infrastructure; neither may be replaced with a local authorization/readiness shortcut.

## Failure model

A valid Captain must not be blocked by stale or mismatched actor/profile identity. An invalid, suspended, missing, wrong-role, wrong-surface, or unreadable eligibility state must not reach `DshCaptainSurface`. Device fingerprint and push registration are context/binding aids, not authorization sources. No stale session or push binding may cross Captains. Development transport health must not be confused with authorization success.

## Closure rule

U002 requires current app-captain tests/typecheck plus affected Identity/Workforce backend evidence. Runtime/device claims require the corresponding runtime evidence; static composition alone is insufficient.

# U009 — field-final-verification-release

## Current-BB diagnosis

Historical U009 explicitly did not have real-device QA or cross-surface readback and referenced a different branch/readback context, so it cannot represent final closure. This unit has no speculative product implementation objective: any failure reopens the owning prior unit. Re-resolve `BB` immediately before the final candidate, ensure every prior unit result is bound to that candidate or to an ancestor whose relevant paths provably did not change, run strict package validation, canonical app-field test/type/lint gates, DSH and WLT backend/database checks, security/isolation negatives, Android device journeys including restart/offline/recovery and one same-store field-to-operator-to-partner/client readback chain. Required blocked/skipped checks are failures. Never mask a blocker with documentation or mix evidence from a moved branch without reconciling affected paths.

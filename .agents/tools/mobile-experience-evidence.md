# Mobile Experience Evidence

Status: DERIVED_SUPPORT
Authority: `tools/prompting/bthwani-orchestrator/04-VERIFY-REDIAGNOSE-CLOSE.md`

Mobile source/static checks are not device interaction proof.

When mobile experience is materially affected, the active host agent must execute a real Android/iOS device or emulator scenario using an available device-capable harness and bind the result to the exact candidate SHA.

Required attestation contract for Final Closure:

```text
BTHWANI_MOBILE_EVIDENCE:v1
{"schema":"BTHWANI_MOBILE_EVIDENCE","version":1,"candidateSha":"<40 sha>","verdict":"PASS","platform":"android|ios","runner":"<device/emulator identity>","scenarios":["<non-empty scenario>"],"evidenceIdentity":"<artifact/log/session identity>"}
```

Rules:
- missing harness/device = `NOT_COVERED`, never PASS;
- static Expo/TypeScript tests cannot substitute for device evidence;
- stale SHA evidence is rejected;
- an empty scenario list is rejected;
- failure/retry/permission/lifecycle behavior must be included when material;
- the attestation is evidence, not Product Truth or closure authority.

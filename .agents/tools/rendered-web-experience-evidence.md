# Rendered Web Experience Evidence

Status: DERIVED_SUPPORT  
Authority: `tools/prompting/bthwani-orchestrator/04-VERIFY-REDIAGNOSE-CLOSE.md`

The reusable rendered-Web workflow is a baseline collector. It is not sufficient proof for every materially changed control-panel journey.

When rendered Web experience is materially affected, the active authorized host agent must execute the relevant rendered journey(s) against the exact candidate and publish exactly one evidence record:

```text
BTHWANI_RENDERED_WEB_EVIDENCE:v1
{"schema":"BTHWANI_RENDERED_WEB_EVIDENCE","version":1,"candidateSha":"<40 sha>","verdict":"PASS","producerIdentity":{"kind":"authorized-host-runner"},"surface":"control-panel","runner":"<browser/harness identity>","scenarios":["<non-empty material scenario>"],"evidenceIdentity":"<artifact/log/session identity>","accessibilityVerdict":"PASS","rtlVerdict":"PASS"}
```

Rules:
- baseline login proof alone does not prove an unrelated changed journey;
- missing adequate rendered scenario evidence = `NOT_COVERED`, never PASS;
- stale SHA evidence is rejected;
- empty scenario lists are rejected;
- accessibility and RTL are explicit evidence dimensions for the Arabic control panel;
- the record is technical runtime evidence, not Product/System Truth, a review, or approval authority.

Required evidence fields additionally include `capturedAt`, `evidenceSha256` (64-hex SHA-256), and `producerIdentity.kind=authorized-host-runner`. Candidate authorship neither satisfies nor disqualifies the proof; the executed scenarios and exact-candidate provenance do.

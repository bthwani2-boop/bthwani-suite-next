# Repair Registry

`registry.json` (schema: `registry.schema.json`) holds PORTFOLIO-loop promotions: a fix pattern that recurred across two or more iteration records (matched by `failureFingerprint`, spec S18) gets promoted here as a named, reusable repair script, or promoted directly into a new guard when the pattern is a governance rule rather than a one-off fix.

Rules:

- An entry requires at least two prior iteration records (`promotedFrom`) as recurrence evidence — a single occurrence is not a pattern.
- `scriptPath` must live under `tools/remediation/repairs/`, not `tools/scripts/` (avoids the retention policy's 90-day one-off-script staleness class).
- Promoting a recurring pattern into a guard instead of a script is preferred when the pattern is a rule violation rather than a mechanical fix; record `promotedToGuard` with the new guard id in that case.
- Nothing here runs automatically — a promoted repair script is invoked explicitly by the engineering-loop controller (wave P0-E) after human review of the pattern, never as an autonomous CI action.

This directory starts empty; the first entry lands after the first real gap closes through more than one iteration with a repeatable fix.

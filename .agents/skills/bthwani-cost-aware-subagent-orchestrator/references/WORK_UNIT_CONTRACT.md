# WORK_UNIT_CONTRACT

Contract for decomposing a BThwani task into bounded work units and for validating
each subagent result. The supervisor (`MASTER_ADVISORY_SUPERVISOR`) dispatches work
units and accepts results only when they match the result contract below.

## Assignment schema

```json
{
  "work_unit_id": "WU-001",
  "title": "Bind client API adapter",
  "role": "FRONTEND_EXECUTOR",
  "objective": "Implement one bounded outcome",
  "dependencies": [],
  "risk_level": "LOW|FOCUSED|STANDARD|HIGH|CRITICAL",
  "capability_tier": "T0_MINIMAL|T1_BALANCED|T2_SPECIALIST|T3_ADVISORY_MAX",
  "execution_mode": "READ_ONLY|WRITE",
  "allowed_read_paths": [],
  "allowed_write_paths": [],
  "forbidden_paths": [],
  "required_context": [],
  "required_skills": [],
  "acceptance_criteria": [],
  "verification_commands": [],
  "output_budget": "COMPACT",
  "escalation_conditions": []
}
```

## Result schema

```json
{
  "work_unit_id": "WU-001",
  "status": "PASS|FAIL|BLOCKED|NEEDS_ESCALATION",
  "summary": "",
  "changed_paths": [],
  "findings": [],
  "checks": [
    {
      "command": "",
      "exit_code": 0,
      "result": "PASS|FAIL|NOT_RUN",
      "reason": ""
    }
  ],
  "assumptions": [],
  "remaining_risks": [],
  "conflicts": [],
  "handoff": ""
}
```

## Field rules

- `work_unit_id` — unique within the run; matches the assignment.
- `objective` — exactly one bounded outcome; no bundled goals.
- `dependencies` — prior `work_unit_id`s that must complete first.
- `allowed_write_paths` — disjoint from every other parallel work unit.
- `forbidden_paths` — paths the executor must never touch.
- `required_context` — smallest sufficient snippets/symbols, not whole files or the repo.
- `acceptance_criteria` — measurable and checkable.
- `verification_commands` — one targeted existing check per unit; no full build/test.
- `output_budget` — `COMPACT`; no long preamble, no extended chain-of-thought.

## Acceptance rules

- Reject a result that does not match the result schema.
- Reject a result that does not state `changed_paths` and `checks`.
- Reject a WRITE result whose `changed_paths` fall outside `allowed_write_paths`.
- A `BLOCKED` or `NEEDS_ESCALATION` result must record `remaining_risks` and a `handoff`.
- On conflict between two units, record it in `conflicts` and return to the supervisor
  for reconciliation; never force-merge overlapping writes.

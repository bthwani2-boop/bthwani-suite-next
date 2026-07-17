# MODEL_ROUTING_AND_TOKEN_POLICY

Routing policy for selecting capability tiers, escalating failures, and bounding
context. Uses symbolic tiers only. Never hardcode commercial model names or versions.

## Capability tiers

```text
T0_MINIMAL      limited reads, direct scoped search, small mechanical edits, non-sensitive formatting, structured extraction
T1_BALANCED     focused feature work, bounded module edits, limited frontend binding, targeted tests, multi-file changes within one owner
T2_SPECIALIST   API contracts, database logic, runtime behavior, security/auth/privacy, DSH/WLT/finance, migrations, in-scope architectural conflicts
T3_ADVISORY_MAX top coordination, cross-layer architecture, conflict analysis, remediation planning, high-risk review, final decision
```

## Task type vs capability matrix

| Task type | Default tier | Never below |
|---|---|---|
| Scoped read / search | `T0_MINIMAL` | `T0_MINIMAL` |
| Small mechanical edit / formatting | `T0_MINIMAL` | `T0_MINIMAL` |
| Structured extraction / list build | `T0_MINIMAL` | `T0_MINIMAL` |
| Focused single-owner feature | `T1_BALANCED` | `T1_BALANCED` |
| Multi-file change within one owner | `T1_BALANCED` | `T1_BALANCED` |
| Targeted tests | `T1_BALANCED` | `T1_BALANCED` |
| API / OpenAPI contract | `T2_SPECIALIST` | `T2_SPECIALIST` |
| Database logic / migrations | `T2_SPECIALIST` | `T2_SPECIALIST` |
| Runtime behavior | `T2_SPECIALIST` | `T2_SPECIALIST` |
| Security / auth / privacy / secrets | `T2_SPECIALIST` | `T2_SPECIALIST` |
| DSH / WLT / finance / commission | `T2_SPECIALIST` | `T2_SPECIALIST` |
| Cross-layer architecture / coordination | `T3_ADVISORY_MAX` | `T3_ADVISORY_MAX` |
| Conflict analysis / remediation plan | `T3_ADVISORY_MAX` | `T3_ADVISORY_MAX` |
| High-risk independent review | `T2_SPECIALIST` | `T2_SPECIALIST` |
| Final decision | `T3_ADVISORY_MAX` | `T3_ADVISORY_MAX` |

## Selection rule

```text
selected_tier = lowest_cost_tier
  that satisfies required_capability
  and risk constraints
  and verification requirements
```

- Never downgrade a tier for cost when it risks accuracy, money, security, data, or public contracts.
- Price is never the sole selection criterion.
- Supervisor (`T3_ADVISORY_MAX`) is preserved for coordination and architectural decisions.

## Escalation ladder

```text
T0_MINIMAL → T1_BALANCED → T2_SPECIALIST
```

- Escalate a failing unit one tier at a time.
- Use `T3_ADVISORY_MAX` for coordination, cross-layer architecture, and conflict resolution.
- Maximum two attempts per failing assertion.
- On escalation, do not resend the full context. Send only:
  - the error,
  - the affected snippet,
  - the failing verification,
  - what was already tried.
- Do not re-run the same agent with the same prompt and unchanged inputs.
- If the same verification fails twice with no new information, stop with `BLOCKED_NEEDS_EVIDENCE`.

## High-risk separation

Separate executor from reviewer in these domains:

```text
auth_sessions_rbac
tenant_isolation
pii_secrets_security
wlt_finance
migrations_production_data
infrastructure_ci_release
critical_high_vulnerabilities
```

- Reviewer tier is at least `T2_SPECIALIST`; use `T3_ADVISORY_MAX` on conflict or critical risk.
- The executor may not self-approve its own high-risk change as final.
- Agent review does not replace formal SDLC approvals owned by `bthwani-sdlc-stage-gate-orchestrator`.

## Platform capability limitation

If the execution platform does not actually offer model or tier selection:

- Do not claim the model was changed.
- Use the available logical roles.
- Emit `routing_capability_limited: true`.
- Record the intended routing as an applicable recommendation for when the feature exists.
- Continue with the strongest safe available configuration.

## Token and effort budgets

No fixed token numbers; they vary by platform and model. Use logical budgets:

```text
planning_budget: minimal_sufficient
executor_budget: scoped_to_work_unit
review_budget: risk_proportional
retry_budget: maximum_two_attempts_per_assertion
```

Combine with `CONTEXT_MINIMIZATION_POLICY` in `SKILL.md`: send scoped snippets, reference
global policies instead of inlining them, reuse prior diagnostics within the run, and stop
each agent once acceptance criteria are met.

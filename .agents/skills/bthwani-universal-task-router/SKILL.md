---
name: bthwani-universal-task-router
version: 2026.07.05-v1
summary: Classify any task into mode, risk, tools, agents, and allowed closure result.
---

# bthwani-universal-task-router

## Invoke when

- any task may edit code
- user asks for deep analysis, closure, 100%, no gaps, full project, DSH/WLT, runtime, UI, security, agents, or refactor
- task mode is unclear

## Read before

- `AGENTS.md`
- `.agents/INDEX.md`
- `.agents/EVIDENCE_GATE_ROUTER.md`
- `.agents/AUTOMATED_EXECUTION_POLICY.md`
- relevant `package.json` scripts

## Execution contract

Classify the task before execution:

- mode
- risk
- owner paths
- required skills
- required tools
- prohibited tools
- verification level
- allowed final result

## Modes

- TEXT_ONLY
- CODE_ONLY
- API_CONTRACT
- UI_CODE
- UI_VISUAL
- RUNTIME
- DSH_WLT
- SECURITY_PRIVACY
- AGENT_SYSTEM
- DEPENDENCY_CI
- REFACTOR_CLEANUP

## Required output

```text
task_mode:
risk_level:
owner_paths:
skills_to_load:
tools_to_use:
tools_forbidden:
verification:
allowed_final_result:
remaining_risk:
```

## Failure decision

- mode unclear -> `NEEDS_EVIDENCE`
- owner unclear -> use Graphify or `NEEDS_EVIDENCE`
- requested closure exceeds evidence -> `PROTOCOL_VIOLATION`

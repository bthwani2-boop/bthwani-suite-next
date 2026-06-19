# Graphify Usage Contract

Graphify is a tool for repository context and navigation.

It is not:

- an agent
- a workflow leader
- a replacement for git diff
- acceptance evidence
- a reason to run all tools

Use Graphify only when:

- file scope is unknown
- import/export relationships matter
- a cross-surface dependency must be traced
- the user asks about relationships or impact

Preferred commands:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
graphify query "<focused question>"
graphify path "<source>" "<target>"
graphify explain "<symbol-or-concept>"
```

Do not run `graphify update .` by default. Run it only when graph data is stale and the current task needs fresh graph navigation.

# OpenCodeReview Remote Tool Policy

## Authority

OpenCodeReview is a remote semantic-review authority executed only by `.github/workflows/opencodereview.yml` on GitHub-hosted runners. `.opencodereview/rule.json` is the repository review policy consumed by that workflow.

Agents and IDE extensions are controllers and evidence readers only. They MUST NOT install or execute `ocr` locally, MUST NOT start an OpenCodeReview MCP/CLI process on the workstation, and MUST NOT present a local OpenCodeReview result as repository evidence.

## Automatic execution

- Pull requests receive exact-head diff review automatically.
- Development pushes receive diff review unless an open PR already owns that candidate review.
- The scheduled run performs a full repository semantic scan.
- Critical and High findings block the OpenCodeReview workflow; all raw JSON, stderr, and normalized summaries are retained as GitHub Actions artifacts.

## Remote invocation from ChatGPT, Codex, Claude, or IDE extensions

Use the governed GitHub remote-command ingress rather than a local shell. Create an issue titled exactly `[remote-command]` whose body is one JSON object.

Full semantic scan:

```json
{
  "schema_version": 2,
  "command": "opencodereview-full",
  "target_ref": "c",
  "expected_sha": "<40-character exact candidate SHA>"
}
```

Diff review against a base ref:

```json
{
  "schema_version": 2,
  "command": "opencodereview-diff",
  "target_ref": "c",
  "expected_sha": "<40-character exact candidate SHA>",
  "base_ref": "master"
}
```

The ingress validates collaborator permission, exact branch syntax, live SHA equality, command schema, and then dispatches the canonical workflow. The issue is only a remote control envelope; it is not execution authority.

## Evidence read-back

Review the exact-SHA `OpenCodeReview` workflow conclusion, the `opencodereview-<SHA>` artifact, and any PR review posted for the same candidate. Remote Analysis Evidence records the corresponding workflow/artifact metadata so ChatGPT/Codex can correlate semantic review with CodeQL, Semgrep, SonarQube, and the remaining remote authorities.

OpenCodeReview is not independent human approval and does not replace product, finance, security, QA, release, or risk authority.

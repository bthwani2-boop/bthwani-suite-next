from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if new in text:
        return
    raise RuntimeError(f"missing anchor in {relative}: {old[:160]!r}")


replace_once(
    "services/dsh/backend/internal/partner/model.go",
    '''type TeamMemberActionInput struct {
\tAction  string `json:"action"`
\tActorID string `json:"-"`
}''',
    '''type TeamMemberActionInput struct {
\tAction         string `json:"action"`
\tActorID        string `json:"-"`
\tReason         string `json:"-"`
\tCorrelationID  string `json:"-"`
\tIdempotencyKey string `json:"-"`
}''',
)

replace_once(
    "services/dsh/backend/internal/partner/handler.go",
    '''\t\tinput.ActorID = actorID
\t\terr := ExecuteStoreTeamMemberAction(db, r.PathValue("storeId"), r.PathValue("memberId"), input)''',
    '''\t\tinput.ActorID = actorID
\t\tinput.Reason = "partner_team_action:" + input.Action
\t\tinput.CorrelationID = correlationID(r)
\t\tinput.IdempotencyKey = idempotencyKey(r)
\t\terr := ExecuteStoreTeamMemberAction(db, r.PathValue("storeId"), r.PathValue("memberId"), input)''',
)

replace_once(
    "services/dsh/backend/internal/partner/repository.go",
    '''\tdefer tx.Rollback()

\tvar currentStoreID, fromStatus string''',
    '''\tdefer tx.Rollback()

\tif input.IdempotencyKey != "" {
\t\tvar replayed bool
\t\tif err := tx.QueryRow(`
\t\t\tSELECT EXISTS (
\t\t\t\tSELECT 1
\t\t\t\tFROM dsh_store_team_member_actions
\t\t\t\tWHERE store_id = $1 AND idempotency_key = $2
\t\t\t)`, storeID, input.IdempotencyKey).Scan(&replayed); err != nil {
\t\t\treturn err
\t\t}
\t\tif replayed {
\t\t\treturn nil
\t\t}
\t}

\tvar currentStoreID, fromStatus string''',
)
replace_once(
    "services/dsh/backend/internal/partner/repository.go",
    '''\tif _, err := tx.Exec(`
\t\tINSERT INTO dsh_store_team_member_actions (
\t\t\tmember_id, store_id, action_label, from_status, to_status, actor_id
\t\t) VALUES ($1, $2, $3, $4, $5, $6)`,
\t\tmemberID, storeID, input.Action, fromStatus, toStatus, input.ActorID); err != nil {''',
    '''\tif _, err := tx.Exec(`
\t\tINSERT INTO dsh_store_team_member_actions (
\t\t\tmember_id, store_id, action_label, from_status, to_status, actor_id,
\t\t\treason, correlation_id, idempotency_key
\t\t) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
\t\tmemberID, storeID, input.Action, fromStatus, toStatus, input.ActorID,
\t\tinput.Reason, input.CorrelationID, input.IdempotencyKey); err != nil {''',
)

replace_once(
    "services/dsh/database/tests/dsh-058_partner_team_idempotency.sql",
    '''    member_id, store_id, action_label, from_status, to_status, actor_id, reason
  ) VALUES (
    v_member_id, v_test_store_id, 'activate', 'active', 'active', v_actor_id, 'retry'
  );''',
    '''    member_id, store_id, action_label, from_status, to_status, actor_id,
    reason, correlation_id, idempotency_key
  ) VALUES (
    v_member_id, v_test_store_id, 'activate', 'active', 'active', v_actor_id,
    'retry', 'test-correlation', 'test-idempotency'
  );''',
)

replace_once(
    "infra/docker/scripts/runtime.ps1",
    '''  $ExpectedFiles = $Manifest.media | Select-Object -ExpandProperty relativeSourcePath

  $MediaDirectory = (Resolve-Path "services/dsh/database/seeds/local/media").Path
  $Missing = $ExpectedFiles | Where-Object { -not (Test-Path (Join-Path $MediaDirectory $_)) }''',
    '''  $ExpectedFiles = @($Manifest.media | Select-Object -ExpandProperty relativeSourcePath)

  $MediaDirectory = (Resolve-Path "services/dsh/database/seeds/local/media").Path
  $Missing = @($ExpectedFiles | Where-Object { -not (Test-Path (Join-Path $MediaDirectory $_)) })''',
)

Path(__file__).unlink()

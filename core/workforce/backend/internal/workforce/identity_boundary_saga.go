package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
)

// identityBoundaryCase is the durable local intent for a cross-authority
// Workforce↔Identity operation. The row is written before the remote call and
// remains recoverable when the process dies after the remote side commits.
type identityBoundaryCase struct {
	ID                 string
	OperatorContextID  string
	Operation          string
	WorkforceKind      string
	ActorID            string
	WorkforceCode      string
	RequestHash        string
	CommandKey         string
	RequestedByActorID string
	RequestedByRole    string
	CorrelationID      string
	LifecycleState     string
}

type identityBoundaryCaseInput struct {
	OperatorContextID  string
	Operation          string
	WorkforceKind      string
	ActorID            string
	WorkforceCode      string
	RequestHash        string
	IdempotencyKey     string
	RequestedByActorID string
	RequestedByRole    string
	CorrelationID      string
	Payload            any
}

var errIdentityBoundaryLeaseLost = errors.New("identity boundary case lease was lost")

func identityBoundaryCommandKey(operation, supplied, requestHash string) string {
	operation = strings.TrimSpace(operation)
	supplied = strings.TrimSpace(supplied)
	requestHash = strings.TrimSpace(requestHash)
	if supplied == "" {
		return fmt.Sprintf("workforce-identity-boundary:v1:%s:%s", operation, requestHash)
	}
	return fmt.Sprintf("workforce-identity-boundary:v1:%s:%s", operation, supplied)
}

func identityBoundaryStorageKey(operatorContextID, commandKey string) string {
	// The historical column is globally unique and capped at 128 bytes. A
	// digest keeps the storage key deterministic without leaking tenant input.
	return hashRequest(struct {
		Context string
		Command string
	}{operatorContextID, commandKey})
}

func (r *Repository) beginIdentityBoundaryCase(ctx context.Context, in identityBoundaryCaseInput) (identityBoundaryCase, error) {
	if strings.TrimSpace(in.OperatorContextID) == "" || strings.TrimSpace(in.Operation) == "" || strings.TrimSpace(in.RequestHash) == "" {
		return identityBoundaryCase{}, ErrInvalidInput
	}
	commandKey := identityBoundaryCommandKey(in.Operation, in.IdempotencyKey, in.RequestHash)
	payload, err := json.Marshal(in.Payload)
	if err != nil {
		return identityBoundaryCase{}, err
	}
	idempotencyKey := identityBoundaryStorageKey(in.OperatorContextID, commandKey)

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return identityBoundaryCase{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var existing identityBoundaryCase
	err = tx.QueryRowContext(ctx, `
		SELECT id::text, operator_context_id, operation, workforce_kind,
		       COALESCE(actor_id,''), COALESCE(workforce_code,''), request_hash,
		       command_idempotency_key, requested_by_actor_id, requested_by_role,
		       correlation_id, lifecycle_state
		FROM workforce_provisioning_cases
		WHERE operator_context_id=$1 AND command_idempotency_key=$2
		FOR UPDATE`, in.OperatorContextID, commandKey).Scan(
		&existing.ID, &existing.OperatorContextID, &existing.Operation, &existing.WorkforceKind,
		&existing.ActorID, &existing.WorkforceCode, &existing.RequestHash, &existing.CommandKey,
		&existing.RequestedByActorID, &existing.RequestedByRole, &existing.CorrelationID,
		&existing.LifecycleState)
	if err == nil {
		if existing.RequestHash != in.RequestHash {
			return identityBoundaryCase{}, ErrIdempotencyConflict
		}
		if err := tx.Commit(); err != nil {
			return identityBoundaryCase{}, err
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return identityBoundaryCase{}, err
	}

	id := uuid.NewString()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO workforce_provisioning_cases (
			id, idempotency_key, status, workforce_kind, actor_id, workforce_code,
			payload, failure_reason, identity_created, operator_context_id,
			operation, request_hash, command_idempotency_key, requested_by_actor_id,
			requested_by_role, correlation_id, lifecycle_state, next_retry_at
		) VALUES ($1::uuid,$2,'INTENT_RECORDED',$3,NULLIF($4,''),NULLIF($5,''),$6::jsonb,'',false,$7,
			$8,$9,$10,$11,$12,$13,'INTENT_RECORDED',now())`,
		id, idempotencyKey, in.WorkforceKind, in.ActorID, in.WorkforceCode, string(payload),
		in.OperatorContextID, in.Operation, in.RequestHash, commandKey,
		in.RequestedByActorID, in.RequestedByRole, in.CorrelationID)
	if err != nil {
		return identityBoundaryCase{}, err
	}
	if err := tx.Commit(); err != nil {
		return identityBoundaryCase{}, err
	}
	return identityBoundaryCase{
		ID: id, OperatorContextID: in.OperatorContextID, Operation: in.Operation,
		WorkforceKind: in.WorkforceKind, ActorID: in.ActorID, WorkforceCode: in.WorkforceCode,
		RequestHash: in.RequestHash, CommandKey: commandKey,
		RequestedByActorID: in.RequestedByActorID, RequestedByRole: in.RequestedByRole,
		CorrelationID: in.CorrelationID, LifecycleState: "INTENT_RECORDED",
	}, nil
}

func (r *Repository) markIdentityBoundaryRemote(ctx context.Context, commandID, actorID, workforceCode string, result any) error {
	encoded, err := json.Marshal(result)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE workforce_provisioning_cases
		SET actor_id=COALESCE(NULLIF($2,''),actor_id), workforce_code=COALESCE(NULLIF($3,''),workforce_code),
			remote_result=$4::jsonb, lifecycle_state='REMOTE_APPLIED', status='REMOTE_APPLIED',
			next_retry_at=now(), attempt_count=attempt_count+1, last_attempt_at=now(),
			updated_at=now(), failure_reason=''
		WHERE id=$1::uuid`, commandID, actorID, workforceCode, string(encoded))
	return err
}

func completeIdentityBoundaryTx(ctx context.Context, tx *sql.Tx, commandID string) error {
	result, err := tx.ExecContext(ctx, `
		UPDATE workforce_provisioning_cases
		SET lifecycle_state='LOCAL_COMMITTED', status='COMPLETED', terminal_disposition='local_projection_committed',
			completed_at=now(), updated_at=now(), lease_token=NULL, lease_owner=NULL, lease_expires_at=NULL
		WHERE id=$1::uuid AND lifecycle_state IN ('INTENT_RECORDED','REMOTE_APPLIED','RETRY_SCHEDULED')`, commandID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errIdentityBoundaryLeaseLost
	}
	return nil
}

func identityBoundaryContext(ctx context.Context, command identityBoundaryCase) context.Context {
	return auth.WithOperatorContext(ctx, command.OperatorContextID)
}

func identityBoundaryRetryable(err error) bool {
	return errors.Is(err, identityclient.ErrUnavailable) || errors.Is(err, identityclient.ErrRateLimited) ||
		errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled)
}

func identityBoundaryRetryAt(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	delay := 15 * time.Second
	for i := 1; i < attempt && delay < 10*time.Minute; i++ {
		delay *= 2
	}
	if delay > 10*time.Minute {
		return 10 * time.Minute
	}
	return delay
}

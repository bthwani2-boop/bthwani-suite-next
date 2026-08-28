package workforce

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/google/uuid"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
)

// Durable lifecycle saga (workforce-029).
//
// Suspend/Reactivate span two sovereigns: Workforce owns the engagement
// projection, Identity owns authentication. There is no cross-sovereign
// transaction, so correctness comes from a durable command whose intent is
// committed in the SAME governed unit as the local status change and its
// audit, plus a reconciler that drives every command to one terminal
// disposition:
//
//      COMPLETED    identity confirmed; local projection is the truth
//      COMPENSATED  identity definitively rejected; local status reverted (audited)
//      SUPERSEDED   the person moved on via a newer governed write; nothing to do
//      FAILED       identity stayed transiently unavailable past max attempts;
//                   local state frozen, alertable, requires operator intervention
//
// Identity's replay contract (a repeated deactivate/reactivate carrying the
// same requested_by/reason/correlation returns success) makes reconciler
// retries with the stored parameters idempotent, so every crash window
// converges instead of splitting sovereign state.

var errLifecycleLeaseLost = errors.New("lifecycle command lease was lost")

const (
	// lifecycleGraceWindow delays the first reconciler drive of a freshly
	// inserted command so the synchronous service path can finish its remote
	// call without competing with the reconciler.
	lifecycleGraceWindow = 30 * time.Second
	// lifecycleLeaseDuration bounds a reconciler's ownership of a command.
	lifecycleLeaseDuration = 90 * time.Second
	// lifecycleMaxAttempts bounds transient retries before FAILED.
	lifecycleMaxAttempts = 10
	// lifecycleClaimLimit bounds one recovery pass.
	lifecycleClaimLimit = 10
)

// lifecycleRetryDelay is the exponential backoff between transient retries,
// starting at 15s and capped at 10 minutes.
func lifecycleRetryDelay(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	delay := 15 * time.Second * time.Duration(math.Pow(2, float64(attempt-1)))
	if delay > 10*time.Minute {
		delay = 10 * time.Minute
	}
	return delay
}

// lifecycleCommandIdempotencyKey derives the deterministic command key: the
// same (operator context, actor, operation, expected version) intent can only
// ever produce one durable command row.
func lifecycleCommandIdempotencyKey(operatorContextID, actorID, operation string, expectedVersion int) string {
	return fmt.Sprintf("workforce-lifecycle:v1:%s:%s:%s:%d", operatorContextID, actorID, operation, expectedVersion)
}

// lifecycleErrorClass separates identity failures that may succeed later from
// definitive rejections that never will.
type lifecycleErrorClass string

const (
	lifecycleTransient  lifecycleErrorClass = "TRANSIENT"
	lifecycleDefinitive lifecycleErrorClass = "DEFINITIVE"
)

func classifyLifecycleError(err error) (lifecycleErrorClass, string) {
	if err == nil {
		return "", ""
	}
	switch {
	case errors.Is(err, identityclient.ErrUnavailable):
		return lifecycleTransient, "IDENTITY_UNAVAILABLE"
	case errors.Is(err, identityclient.ErrRateLimited):
		return lifecycleTransient, "IDENTITY_RATE_LIMITED"
	case errors.Is(err, identityclient.ErrActorNotFound):
		return lifecycleDefinitive, "IDENTITY_ACTOR_NOT_FOUND"
	case errors.Is(err, identityclient.ErrActorStateConflict):
		return lifecycleDefinitive, "IDENTITY_ACTOR_STATE_CONFLICT"
	case errors.Is(err, identityclient.ErrOperatorContextForbidden):
		return lifecycleDefinitive, "IDENTITY_OPERATOR_CONTEXT_FORBIDDEN"
	case errors.Is(err, context.DeadlineExceeded), errors.Is(err, context.Canceled):
		return lifecycleTransient, "CONTEXT_DEADLINE"
	default:
		return lifecycleDefinitive, "IDENTITY_REJECTED"
	}
}

func lifecycleErrorCode(err error) string {
	class, code := classifyLifecycleError(err)
	if class == "" {
		return ""
	}
	return code
}

func lifecycleMutationAction(operation string) string {
	if operation == "reactivate" {
		return "workforce.reactivated"
	}
	return "workforce.suspended"
}

func lifecycleRevertAction(operation string) string {
	if operation == "reactivate" {
		return "workforce.reactivate_reverted"
	}
	return "workforce.suspend_reverted"
}

func lifecycleConfirmAction(operation string) string {
	if operation == "reactivate" {
		return "workforce.reactivate_identity_confirmed"
	}
	return "workforce.suspend_identity_confirmed"
}

func lifecycleOperationName(operation string) string {
	if operation == "reactivate" {
		return "reactivate_workforce_actor"
	}
	return "suspend_workforce_actor"
}

// lifecycleCommand is the reconciler read model of one durable command.
type lifecycleCommand struct {
	ID                 string
	OperatorContextID  string
	ActorID            string
	Operation          string
	FromStatus         string
	ToStatus           string
	Reason             string
	RequestedByActorID string
	RequestedByRole    string
	CorrelationID      string
	AttemptCount       int
	LeaseToken         string
}

// claimStaleLifecycleCommands atomically leases recoverable commands whose
// retry window has opened. FOR UPDATE SKIP LOCKED keeps concurrent
// reconciler instances from racing on the same rows.
func (r *Repository) claimStaleLifecycleCommands(ctx context.Context, owner string, limit int, lease time.Duration) ([]lifecycleCommand, error) {
	leaseSeconds := fmt.Sprintf("%.6f seconds", lease.Seconds())
	rows, err := r.db.QueryContext(ctx, `
                WITH candidates AS (
                        SELECT id FROM workforce_lifecycle_commands
                        WHERE lifecycle_state IN ('IN_FLIGHT','RETRY_SCHEDULED')
                                AND next_retry_at <= now()
                                AND (lease_expires_at IS NULL OR lease_expires_at <= now())
                        ORDER BY next_retry_at, created_at
                        LIMIT $1
                        FOR UPDATE SKIP LOCKED
                )
                UPDATE workforce_lifecycle_commands command
                SET lifecycle_state='IN_FLIGHT', lease_token=gen_random_uuid(), lease_owner=$2,
                        lease_expires_at=now()+$3::interval, attempt_count=command.attempt_count+1,
                        last_attempt_at=now(), updated_at=now()
                FROM candidates WHERE command.id=candidates.id
                RETURNING command.id::text, command.operator_context_id, command.actor_id, command.operation,
                        command.from_status, command.to_status, command.reason,
                        command.requested_by_actor_id, command.requested_by_role, command.correlation_id,
                        command.attempt_count, command.lease_token::text`,
		limit, owner, leaseSeconds)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	commands := []lifecycleCommand{}
	for rows.Next() {
		var cmd lifecycleCommand
		if err := rows.Scan(&cmd.ID, &cmd.OperatorContextID, &cmd.ActorID, &cmd.Operation,
			&cmd.FromStatus, &cmd.ToStatus, &cmd.Reason,
			&cmd.RequestedByActorID, &cmd.RequestedByRole, &cmd.CorrelationID,
			&cmd.AttemptCount, &cmd.LeaseToken); err != nil {
			return nil, err
		}
		commands = append(commands, cmd)
	}
	return commands, rows.Err()
}

// releaseLifecycleRetry reschedules a leased command for a later transient
// retry without any terminal disposition.
func (r *Repository) releaseLifecycleRetry(ctx context.Context, cmd lifecycleCommand, code string, cause error, delay time.Duration) error {
	delaySeconds := fmt.Sprintf("%.6f seconds", delay.Seconds())
	result, err := r.db.ExecContext(ctx, `
                UPDATE workforce_lifecycle_commands
                SET lifecycle_state='RETRY_SCHEDULED', next_retry_at=now()+$2::interval,
                        last_error_code=$3, last_error=$4,
                        lease_token=NULL, lease_owner=NULL, lease_expires_at=NULL, updated_at=now()
                WHERE id=$1::uuid AND lease_token=$5::uuid AND lifecycle_state='IN_FLIGHT'`,
		cmd.ID, delaySeconds, code, cause.Error(), cmd.LeaseToken)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errLifecycleLeaseLost
	}
	return nil
}

// ProcessLifecycleRecoveryPass runs one recovery pass over stale lifecycle
// commands and returns how many commands were examined. It is safe to run
// concurrently with the service and with other passes.
func ProcessLifecycleRecoveryPass(ctx context.Context, db *sql.DB, identity *identityclient.Client) (int, error) {
	repo := NewRepository(db)
	commands, err := repo.claimStaleLifecycleCommands(ctx, "lifecycle-reconciler", lifecycleClaimLimit, lifecycleLeaseDuration)
	if err != nil {
		return 0, err
	}
	for _, cmd := range commands {
		if err := processLifecycleCommand(ctx, repo, identity, cmd); err != nil {
			log.Printf("[workforce] lifecycle reconciler command=%s operation=%s actor=%s: %v",
				cmd.ID, cmd.Operation, cmd.ActorID, err)
		}
	}
	return len(commands), nil
}

// RunLifecycleReconciler drives durable lifecycle commands to convergence
// until the context is cancelled. One pass runs every interval.
func RunLifecycleReconciler(ctx context.Context, db *sql.DB, identity *identityclient.Client, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if _, err := ProcessIdentityBoundaryRecoveryPass(ctx, db, identity); err != nil {
				log.Printf("[workforce] identity boundary reconciler pass failed: %v", err)
			}
			if _, err := ProcessLifecycleRecoveryPass(ctx, db, identity); err != nil {
				log.Printf("[workforce] lifecycle reconciler pass failed: %v", err)
			}
		}
	}
}

// processLifecycleCommand drives one claimed command toward a terminal
// disposition. Ordering: supersession first (the person may have moved on via
// a newer governed write), then the identity call, then the audited outcome.
func processLifecycleCommand(ctx context.Context, repo *Repository, identity *identityclient.Client, cmd lifecycleCommand) error {
	opCtx := auth.WithOperatorContext(ctx, cmd.OperatorContextID)
	lease, err := uuid.Parse(cmd.LeaseToken)
	if err != nil {
		return fmt.Errorf("parse lease token: %w", err)
	}

	current, readErr := repo.PersonByActorID(opCtx, cmd.ActorID)
	if errors.Is(readErr, ErrNotFound) {
		return finishLifecycleSuperseded(opCtx, repo, cmd, lease, "person_removed")
	}
	if readErr != nil {
		return repo.releaseLifecycleRetry(ctx, cmd, "LOCAL_READ_FAILED", readErr, lifecycleRetryDelay(cmd.AttemptCount))
	}
	if current.EngagementStatus != cmd.ToStatus {
		return finishLifecycleSuperseded(opCtx, repo, cmd, lease, "superseded_by_newer_state")
	}

	if identity == nil {
		return repo.releaseLifecycleRetry(ctx, cmd, "IDENTITY_UNAVAILABLE", errLifecycleIdentityMissing, lifecycleRetryDelay(cmd.AttemptCount))
	}

	var remoteErr error
	if cmd.Operation == "reactivate" {
		remoteErr = identity.Reactivate(opCtx, cmd.ActorID, cmd.RequestedByActorID, cmd.Reason, cmd.CorrelationID)
	} else {
		remoteErr = identity.Deactivate(opCtx, cmd.ActorID, cmd.RequestedByActorID, cmd.Reason, cmd.CorrelationID)
	}

	if remoteErr == nil {
		return repo.GovernedWrite(opCtx, func(tx *sql.Tx) error {
			if err := recordAuditTx(opCtx, tx, auditInput{
				OperatorContextID: cmd.OperatorContextID, ActorID: cmd.RequestedByActorID, ActorRole: cmd.RequestedByRole,
				TargetActorID: cmd.ActorID, Action: lifecycleConfirmAction(cmd.Operation), Operation: lifecycleOperationName(cmd.Operation),
				FromState: current, ToState: current, Reason: cmd.Reason, CorrelationID: cmd.CorrelationID,
			}); err != nil {
				return err
			}
			return markLifecycleCommandTx(opCtx, tx, cmd.ID, lease, "COMPLETED", "identity_confirmed", "", "")
		})
	}

	class, code := classifyLifecycleError(remoteErr)
	switch class {
	case lifecycleTransient:
		if cmd.AttemptCount >= lifecycleMaxAttempts {
			return repo.GovernedWrite(opCtx, func(tx *sql.Tx) error {
				if err := recordAuditTx(opCtx, tx, auditInput{
					OperatorContextID: cmd.OperatorContextID, ActorID: cmd.RequestedByActorID, ActorRole: cmd.RequestedByRole,
					TargetActorID: cmd.ActorID, Action: "workforce.lifecycle_retry_exhausted", Operation: lifecycleOperationName(cmd.Operation),
					FromState: current, ToState: current, Reason: cmd.Reason, CorrelationID: cmd.CorrelationID,
				}); err != nil {
					return err
				}
				return markLifecycleCommandTx(opCtx, tx, cmd.ID, lease, "FAILED", "retry_exhausted", code, remoteErr.Error())
			})
		}
		return repo.releaseLifecycleRetry(ctx, cmd, code, remoteErr, lifecycleRetryDelay(cmd.AttemptCount))
	default:
		// Definitive remote rejection: the local projection cannot stand, so
		// compensate with an audited revert in the same governed unit as the
		// terminal mark. If the unit fails the lease is released and the next
		// pass retries (supersession re-checked first).
		compErr := repo.GovernedWrite(opCtx, func(tx *sql.Tx) error {
			if _, err := setEngagementStatusTx(opCtx, tx, cmd.ActorID, cmd.FromStatus, current.Version); err != nil {
				return err
			}
			if err := markLifecycleCommandTx(opCtx, tx, cmd.ID, lease, "COMPENSATED", "identity_rejected", code, remoteErr.Error()); err != nil {
				return err
			}
			return recordAuditTx(opCtx, tx, auditInput{
				OperatorContextID: cmd.OperatorContextID, ActorID: cmd.RequestedByActorID, ActorRole: cmd.RequestedByRole,
				TargetActorID: cmd.ActorID, Action: lifecycleRevertAction(cmd.Operation), Operation: lifecycleOperationName(cmd.Operation),
				FromState: current, ToState: cmd.FromStatus, Reason: cmd.Reason, CorrelationID: cmd.CorrelationID,
			})
		})
		if compErr != nil {
			return repo.releaseLifecycleRetry(ctx, cmd, "COMPENSATION_UNIT_FAILED", compErr, lifecycleRetryDelay(1))
		}
		return nil
	}
}

var errLifecycleIdentityMissing = errors.New("identity client is not configured")

// finishLifecycleSuperseded marks a command SUPERSEDED: the person already
// moved past this command's target state through a newer governed write (or
// was removed), so the remote call is unnecessary and the newer command's own
// audit trail governs the current state.
func finishLifecycleSuperseded(ctx context.Context, repo *Repository, cmd lifecycleCommand, lease uuid.UUID, disposition string) error {
	return repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		return markLifecycleCommandTx(ctx, tx, cmd.ID, lease, "SUPERSEDED", disposition, "", "")
	})
}

// confirmLifecycleCommand records the identity confirmation of a synchronous
// service call. Failure does NOT fail the caller's operation — the remote
// effect happened and the durable command guarantees the reconciler will
// confirm it; the failure is logged loudly instead.
func (s *Service) confirmLifecycleCommand(ctx context.Context, operator Operator, actorID, operation, commandID string, person Person, reason, correlationID string) {
	confirmErr := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		if err := recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: lifecycleConfirmAction(operation), Operation: lifecycleOperationName(operation),
			FromState: person, ToState: person, Reason: reason, CorrelationID: correlationID,
		}); err != nil {
			return err
		}
		return markLifecycleCommandTx(ctx, tx, commandID, uuid.Nil, "COMPLETED", "identity_confirmed", "", "")
	})
	if confirmErr != nil {
		log.Printf("[workforce] lifecycle %s confirmation unit failed actor=%s command=%s: %v (reconciler will confirm)", operation, actorID, commandID, confirmErr)
	}
}

// compensateLifecycleCommand reverts the local status change with an audited
// governed unit and terminates the command as COMPENSATED. When the
// compensation unit itself fails the command stays IN_FLIGHT and the
// reconciler finishes the compensation; the caller receives the loud
// governedRevertError alongside the original remote rejection.
func (s *Service) compensateLifecycleCommand(ctx context.Context, operator Operator, actorID, operation, commandID string, before, after Person, reason, correlationID string, remoteErr error) error {
	revertErr := s.repo.GovernedWrite(ctx, func(tx *sql.Tx) error {
		if _, err := setEngagementStatusTx(ctx, tx, actorID, before.EngagementStatus, after.Version); err != nil {
			return err
		}
		if err := markLifecycleCommandTx(ctx, tx, commandID, uuid.Nil, "COMPENSATED", "identity_rejected", lifecycleErrorCode(remoteErr), remoteErr.Error()); err != nil {
			return err
		}
		return recordAuditTx(ctx, tx, auditInput{
			OperatorContextID: operator.OperatorContextID, ActorID: operator.ActorID, ActorRole: operator.Role,
			TargetActorID: actorID, Action: lifecycleRevertAction(operation), Operation: lifecycleOperationName(operation),
			FromState: after, ToState: before, Reason: reason, CorrelationID: correlationID,
		})
	})
	if revertErr != nil {
		log.Printf("[workforce] lifecycle %s compensation unit failed actor=%s command=%s: %v (reconciler will finish)", operation, actorID, commandID, revertErr)
		return governedRevertError(operation, remoteErr, revertErr)
	}
	return remoteErr
}

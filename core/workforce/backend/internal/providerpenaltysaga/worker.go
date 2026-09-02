package providerpenaltysaga

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
	"workforce-api/internal/wltclient"
)

const (
	batchSize     = 20
	claimLease    = 45 * time.Second
	remoteTimeout = 12 * time.Second
)

var (
	errLeaseLost = errors.New("provider penalty command lease was lost")
)

type command struct {
	ID                        string
	OperatorContextID         string
	IncidentID                string
	SourceVersion             int
	Operation                 string
	IdempotencyKey            string
	ProviderActorID           string
	ProviderActorType         string
	PolicyID                  string
	Reason                    string
	RequestedByActorID        string
	RequestedByRole           string
	CorrelationID             string
	LifecycleState            string
	AttemptCount              int
	ReadbackAttemptCount      int
	RemotePenaltyID           string
	RemoteLedgerTransactionID string
	RemoteStatus              string
	TerminalDisposition       string
	ParentCommandID           string
	ParentLifecycleState      string
	ParentRemotePenaltyID     string
	IncidentOperatorContextID string
	ActorOperatorContextID    string
	IncidentStatus            string
	IncidentVersion           int
	IncidentFinancialRef      string
	LeaseToken                string
	NeedsReadback             bool
}

func needsAuthoritativeReadback(state string) bool {
	return state == "IN_FLIGHT" || state == "REMOTE_OUTCOME_UNKNOWN" || state == "RECONCILING"
}

func operatorContextValid(item command) bool {
	return item.OperatorContextID != "" && item.OperatorContextID == item.IncidentOperatorContextID && item.OperatorContextID == item.ActorOperatorContextID
}

// projectionDisposition decides how a REMOTE-CONFIRMED (or absence-proven)
// financial fact converges onto the incident projection, based on the
// incident's CURRENT status path — never on incidental version drift from
// non-status edits. A version bump alone (note/evidence edit) can never
// strand a live financial effect (root #3).
type projectionDisposition string

const (
	projectionProceed              projectionDisposition = "proceed"
	projectionAlreadyConverged     projectionDisposition = "already_converged"
	projectionSupersededByReversal projectionDisposition = "superseded_by_reversal"
	projectionConflict             projectionDisposition = "conflict"
)

func decideProjectionDisposition(operation, currentStatus, currentRef, remoteID string, absent bool) projectionDisposition {
	target := "financial_action_posted"
	if operation == "reverse" {
		target = "reversed"
	}
	if currentStatus == target && (remoteID == "" || currentRef == remoteID) {
		return projectionAlreadyConverged
	}
	switch operation {
	case "post":
		switch currentStatus {
		case "approved":
			return projectionProceed
		case "reversed":
			// A later reversal already projected the incident past this post;
			// the reversal command owns the projection and the ledger trail.
			return projectionSupersededByReversal
		}
	case "reverse":
		if currentStatus == "financial_action_posted" || (absent && currentStatus == "approved") {
			return projectionProceed
		}
	}
	// Statuses that can never legally reach the target (e.g. post onto a
	// rejected/closed incident, reverse onto a closed incident) are escalated,
	//      not terminally rejected: the WLT financial effect is real and must stay
	// visible in the recovery index until an operator resolves the conflict.
	return projectionConflict
}

// projectionConflictError is the escalation signal for decideProjectionDisposition
// conflicts; it keeps the command recoverable (REMOTE_CONFIRMED + backoff)
// instead of terminally rejecting a live financial fact.
var errProjectionStatusConflict = errors.New("incident status path conflicts with a remote-confirmed financial fact; operator resolution required")

func projectionConflictCode(operation, currentStatus string) string {
	return "PROJECTION_STATUS_CONFLICT_" + strings.ToUpper(operation[0:1]) + strings.ToUpper(currentStatus[0:1]) + "_" + currentStatus
}

func parentDisposition(state string) string {
	switch state {
	case "COMPLETED":
		return "proceed"
	case "PERMANENTLY_REJECTED", "HISTORIC_UNPROVEN":
		return "project_absent"
	default:
		return "wait"
	}
}

func mutationFailureDisposition(err error) string {
	switch {
	case errors.Is(err, wltclient.ErrOutcomeUnknown):
		return "reconcile"
	case errors.Is(err, wltclient.ErrRetryable):
		return "retry"
	default:
		return "reject"
	}
}

func workerID() string {
	host, _ := os.Hostname()
	if strings.TrimSpace(host) == "" {
		host = "workforce"
	}
	return host + ":" + uuid.NewString()
}

func claimBatch(ctx context.Context, db *sql.DB, owner string, limit int, lease time.Duration) ([]command, error) {
	if limit <= 0 {
		return []command{}, nil
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	rows, err := tx.QueryContext(ctx, `SELECT command.id::text,command.operator_context_id,command.incident_id::text,
                command.incident_source_version,command.operation,command.command_idempotency_key,
                command.provider_actor_id,command.provider_actor_type,command.policy_id,command.reason,
                command.requested_by_actor_id,command.requested_by_role,command.correlation_id,
                command.lifecycle_state,command.attempt_count,command.readback_attempt_count,
                command.remote_penalty_id,command.remote_ledger_transaction_id,command.remote_status,
                command.terminal_disposition,COALESCE(command.parent_command_id::text,''),
                COALESCE(parent.lifecycle_state,''),COALESCE(parent.remote_penalty_id,''),
                COALESCE(incident.operator_context_id,''),COALESCE(person.operator_context_id,''),
                COALESCE(incident.status,''),COALESCE(incident.version,0),COALESCE(incident.wlt_ledger_reference,'')
        FROM workforce_provider_penalty_commands command
        LEFT JOIN workforce_provider_penalty_commands parent ON parent.id=command.parent_command_id
        LEFT JOIN workforce_provider_incidents incident ON incident.id=command.incident_id
        LEFT JOIN workforce_people person ON person.actor_id=command.provider_actor_id
        WHERE command.next_retry_at <= NOW() AND (
                command.lifecycle_state IN ('READY','REMOTE_OUTCOME_UNKNOWN','REMOTE_CONFIRMED','LOCAL_PROJECTION_PENDING','RECONCILING','RETRY_SCHEDULED')
                OR (command.lifecycle_state='IN_FLIGHT' AND (command.lease_expires_at IS NULL OR command.lease_expires_at <= NOW()))
        )
        ORDER BY command.created_at,command.id
        LIMIT $1 FOR UPDATE OF command SKIP LOCKED`, limit)
	if err != nil {
		return nil, err
	}
	items := make([]command, 0, limit)
	for rows.Next() {
		var item command
		if err := rows.Scan(&item.ID, &item.OperatorContextID, &item.IncidentID, &item.SourceVersion,
			&item.Operation, &item.IdempotencyKey, &item.ProviderActorID, &item.ProviderActorType,
			&item.PolicyID, &item.Reason, &item.RequestedByActorID, &item.RequestedByRole,
			&item.CorrelationID, &item.LifecycleState, &item.AttemptCount, &item.ReadbackAttemptCount,
			&item.RemotePenaltyID, &item.RemoteLedgerTransactionID, &item.RemoteStatus,
			&item.TerminalDisposition, &item.ParentCommandID, &item.ParentLifecycleState,
			&item.ParentRemotePenaltyID, &item.IncidentOperatorContextID, &item.ActorOperatorContextID,
			&item.IncidentStatus, &item.IncidentVersion, &item.IncidentFinancialRef); err != nil {
			_ = rows.Close()
			return nil, err
		}
		item.NeedsReadback = needsAuthoritativeReadback(item.LifecycleState)
		item.LeaseToken = uuid.NewString()
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, fmt.Errorf("close provider penalty command rows: %w", err)
	}
	leaseSeconds := fmt.Sprintf("%.6f seconds", lease.Seconds())
	for index := range items {
		result, err := tx.ExecContext(ctx, `UPDATE workforce_provider_penalty_commands
                        SET lifecycle_state='IN_FLIGHT',lease_token=$2::uuid,lease_owner=$3,
                                lease_expires_at=NOW()+$4::interval,last_attempt_at=NOW(),updated_at=NOW()
                        WHERE id=$1::uuid AND lifecycle_state=$5`, items[index].ID, items[index].LeaseToken,
			owner, leaseSeconds, items[index].LifecycleState)
		if err != nil {
			return nil, err
		}
		count, err := result.RowsAffected()
		if err != nil || count != 1 {
			return nil, fmt.Errorf("claim provider penalty command %s was not fenced", items[index].ID)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return items, nil
}

func backoff(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 10 {
		attempt = 10
	}
	return time.Duration(1<<attempt) * time.Second
}

func fencedUpdate(ctx context.Context, db *sql.DB, item command, query string, args ...any) (bool, error) {
	values := append([]any{item.ID, item.LeaseToken}, args...)
	result, err := db.ExecContext(ctx, query, values...)
	if err != nil {
		return false, err
	}
	count, err := result.RowsAffected()
	return count == 1, err
}

func requireFencedUpdate(ok bool, err error) error {
	if err != nil {
		return err
	}
	if !ok {
		return errLeaseLost
	}
	return nil
}

func releaseRetry(ctx context.Context, db *sql.DB, item command, code string, cause error) error {
	next := item.AttemptCount + 1
	ok, err := fencedUpdate(ctx, db, item, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='RETRY_SCHEDULED',attempt_count=$3,next_retry_at=NOW()+$4::interval,
                        last_error_code=$5,last_error=$6,lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='IN_FLIGHT' AND lease_expires_at>NOW()`,
		next, fmt.Sprintf("%.6f seconds", backoff(next).Seconds()), code, errorText(cause))
	return requireFencedUpdate(ok, err)
}

func markUnknown(ctx context.Context, db *sql.DB, item command, cause error) error {
	next := item.AttemptCount + 1
	ok, err := fencedUpdate(ctx, db, item, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='REMOTE_OUTCOME_UNKNOWN',attempt_count=$3,reconciliation_state='REQUIRED',
                        next_retry_at=NOW()+$4::interval,last_error_code='REMOTE_OUTCOME_UNKNOWN',last_error=$5,
                        lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='IN_FLIGHT' AND lease_expires_at>NOW()`,
		next, fmt.Sprintf("%.6f seconds", backoff(next).Seconds()), errorText(cause))
	return requireFencedUpdate(ok, err)
}

func markReadbackFailure(ctx context.Context, db *sql.DB, item command, cause error) error {
	next := item.ReadbackAttemptCount + 1
	ok, err := fencedUpdate(ctx, db, item, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='RECONCILING',readback_attempt_count=$3,reconciliation_state='REQUIRED',last_readback_at=NOW(),
                        next_retry_at=NOW()+$4::interval,last_error_code='READBACK_RETRYABLE',last_error=$5,
                        lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='IN_FLIGHT' AND lease_expires_at>NOW()`,
		next, fmt.Sprintf("%.6f seconds", backoff(next).Seconds()), errorText(cause))
	return requireFencedUpdate(ok, err)
}

func markPermanent(ctx context.Context, db *sql.DB, item command, code string, cause error) error {
	ok, err := fencedUpdate(ctx, db, item, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='PERMANENTLY_REJECTED',last_error_code=$3,last_error=$4,
                        terminal_disposition=$3,reconciliation_state=CASE WHEN remote_penalty_id='' THEN 'ABSENT' ELSE reconciliation_state END,
                        completed_at=NOW(),lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid
                  AND lifecycle_state IN ('IN_FLIGHT','REMOTE_CONFIRMED','LOCAL_PROJECTION_PENDING')
                  AND lease_expires_at>NOW()`, code, errorText(cause))
	return requireFencedUpdate(ok, err)
}

func reconcileHistoricAbsence(ctx context.Context, db *sql.DB, item command, cause error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	result, err := tx.ExecContext(ctx, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='HISTORIC_UNPROVEN',last_error_code='HISTORIC_WLT_EVIDENCE_ABSENT',last_error=$3,
                        terminal_disposition='historic_wlt_evidence_absent',reconciliation_state='ABSENT',
                        completed_at=NOW(),last_readback_at=NOW(),lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='IN_FLIGHT' AND lease_expires_at>NOW()`,
		item.ID, item.LeaseToken, errorText(cause))
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return errLeaseLost
	}
	if item.Operation == "post" && (item.IncidentStatus == "financial_action_posted" || item.IncidentStatus == "reversed") {
		// Status-fenced, not version-fenced: a non-status edit that bumped
		// the version must not abort an authoritative absence projection.
		incidentResult, err := tx.ExecContext(ctx, `UPDATE workforce_provider_incidents
                        SET status='approved',wlt_ledger_reference='',resolved_at=NULL,version=version+1,updated_at=NOW()
                        WHERE operator_context_id=$1 AND id=$2::uuid AND status=$3`,
			item.OperatorContextID, item.IncidentID, item.IncidentStatus)
		if err != nil {
			return err
		}
		incidentCount, err := incidentResult.RowsAffected()
		if err != nil {
			return err
		}
		if incidentCount != 1 {
			return fmt.Errorf("historic incident changed before authoritative absence projection: %w", errProjectionStatusConflict)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO workforce_provider_incident_transitions(
                        operator_context_id,incident_id,actor_id,from_status,to_status,reason,wlt_ledger_reference,
                        decided_by_actor_id,incident_version,financial_command_id)
                        VALUES($1,$2::uuid,$3,$4,'approved',$5,'',$6,$7+1,$8::uuid)
                        ON CONFLICT (financial_command_id) WHERE financial_command_id IS NOT NULL DO NOTHING`,
			item.OperatorContextID, item.IncidentID, item.ProviderActorID, item.IncidentStatus,
			"WLT authoritative readback found no historical financial record", item.RequestedByActorID,
			item.IncidentVersion, item.ID); err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO workforce_action_audit(
                operator_context_id,actor_id,actor_role,target_actor_id,action,operation,from_state,to_state,
                reason,correlation_id,idempotency_key,financial_command_id)
                VALUES($1,$2,$3,$4,'provider.incident.historic_financial_claim_reconciled',$5,
                        jsonb_build_object('status',$6::text,'version',$7::integer,'wltPenaltyId',$8::text),
                        jsonb_build_object('status',CASE WHEN $5::text='provider_penalty_post' AND $6::text IN ('financial_action_posted','reversed') THEN 'approved' ELSE $6::text END,
                                'version',CASE WHEN $5='provider_penalty_post' AND $6 IN ('financial_action_posted','reversed') THEN $7::integer+1 ELSE $7::integer END,
                                'wltReadback','ABSENT'),$9,$10,$11,$12::uuid)
                ON CONFLICT (financial_command_id) WHERE financial_command_id IS NOT NULL DO NOTHING`,
		item.OperatorContextID, item.RequestedByActorID, item.RequestedByRole, item.ProviderActorID,
		"provider_penalty_"+item.Operation, item.IncidentStatus, item.IncidentVersion,
		item.IncidentFinancialRef, errorText(cause), item.CorrelationID, item.IdempotencyKey, item.ID); err != nil {
		return err
	}
	return tx.Commit()
}

func markAbsentReady(ctx context.Context, db *sql.DB, item command) error {
	ok, err := fencedUpdate(ctx, db, item, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='READY',reconciliation_state='ABSENT',last_readback_at=NOW(),next_retry_at=NOW(),
                        last_error_code='',last_error='',lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='IN_FLIGHT' AND lease_expires_at>NOW()`)
	return requireFencedUpdate(ok, err)
}

func markConfirmed(ctx context.Context, db *sql.DB, item command, remote wltclient.SagaProviderPenalty) (bool, error) {
	return fencedUpdate(ctx, db, item, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='REMOTE_CONFIRMED',remote_penalty_id=$3,remote_ledger_transaction_id=$4,
                        remote_status=$5,reconciliation_state='FOUND',remote_confirmed_at=NOW(),next_retry_at=NOW(),
                        last_error_code='',last_error='',lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='IN_FLIGHT' AND lease_expires_at>NOW()`,
		remote.ID, remote.LedgerTransactionID, remote.Status)
}

func releaseProjectionRetry(ctx context.Context, db *sql.DB, item command, cause error) error {
	ok, err := fencedUpdate(ctx, db, item, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='REMOTE_CONFIRMED',next_retry_at=NOW()+$3::interval,
                        last_error_code='LOCAL_PROJECTION_RETRYABLE',last_error=$4,
                        lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='IN_FLIGHT' AND lease_expires_at>NOW()`,
		fmt.Sprintf("%.6f seconds", backoff(item.AttemptCount+1).Seconds()), errorText(cause))
	return requireFencedUpdate(ok, err)
}

func validRemote(item command, remote wltclient.SagaProviderPenalty) bool {
	if remote.ID == "" || remote.LedgerTransactionID == "" || remote.IncidentID != item.IncidentID ||
		remote.ProviderActorID != item.ProviderActorID || remote.ProviderActorType != item.ProviderActorType {
		return false
	}
	if item.Operation == "post" {
		return remote.PolicyID == item.PolicyID && remote.IdempotencyKey == item.IdempotencyKey
	}
	return remote.Status == "reversed" && remote.ReversalIdempotencyKey == item.IdempotencyKey
}

func project(ctx context.Context, db *sql.DB, item command, remote *wltclient.SagaProviderPenalty, absent bool) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	result, err := tx.ExecContext(ctx, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='LOCAL_PROJECTION_PENDING',reconciliation_state=CASE WHEN $3 THEN 'ABSENT' ELSE 'FOUND' END,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state IN ('IN_FLIGHT','REMOTE_CONFIRMED')
                        AND lease_expires_at>NOW()`, item.ID, item.LeaseToken, absent)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return errLeaseLost
	}
	var currentStatus, currentRef, actorID string
	var currentVersion int
	if err := tx.QueryRowContext(ctx, `SELECT status,wlt_ledger_reference,actor_id,version
                FROM workforce_provider_incidents WHERE operator_context_id=$1 AND id=$2::uuid FOR UPDATE`,
		item.OperatorContextID, item.IncidentID).Scan(&currentStatus, &currentRef, &actorID, &currentVersion); err != nil {
		return err
	}
	target := "financial_action_posted"
	remoteID, ledgerID, remoteStatus := "", "", "absent"
	if item.Operation == "reverse" {
		target = "reversed"
	}
	if remote != nil {
		remoteID, ledgerID, remoteStatus = remote.ID, remote.LedgerTransactionID, remote.Status
	}
	// Authority is the incident's CURRENT status path under the row lock
	// held above; incidental version drift from non-status edits cannot
	// strand the financial fact (root #3).
	disposition := decideProjectionDisposition(item.Operation, currentStatus, currentRef, remoteID, absent)
	if disposition == projectionAlreadyConverged {
		if _, err := tx.ExecContext(ctx, `INSERT INTO workforce_action_audit(
                        operator_context_id,actor_id,actor_role,target_actor_id,action,operation,from_state,to_state,reason,correlation_id,idempotency_key,financial_command_id)
                        VALUES($1,$2,$3,$4,'provider.incident.financial_saga_reconciled',$5,
                                jsonb_build_object('status',$6::text,'version',$7::integer),
                                jsonb_build_object('status',$6::text,'version',$7::integer,'wltPenaltyId',$8::text,'wltLedgerTransactionId',$9::text,'wltStatus',$10::text),
                                $11,$12,$13,$14::uuid)
                        ON CONFLICT (financial_command_id) WHERE financial_command_id IS NOT NULL DO NOTHING`,
			item.OperatorContextID, item.RequestedByActorID, item.RequestedByRole, actorID,
			"provider_penalty_"+item.Operation, currentStatus, currentVersion, remoteID, ledgerID, remoteStatus,
			item.Reason, item.CorrelationID, item.IdempotencyKey, item.ID); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE workforce_provider_penalty_commands
                        SET lifecycle_state='COMPLETED',terminal_disposition='projected',completed_at=NOW(),
                                lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                        WHERE id=$1::uuid AND lease_token=$2::uuid`, item.ID, item.LeaseToken)
		if err != nil {
			return err
		}
		return tx.Commit()
	}
	if disposition == projectionSupersededByReversal {
		if _, err := tx.ExecContext(ctx, `INSERT INTO workforce_action_audit(
                        operator_context_id,actor_id,actor_role,target_actor_id,action,operation,from_state,to_state,reason,correlation_id,idempotency_key,financial_command_id)
                        VALUES($1,$2,$3,$4,'provider.incident.financial_saga_superseded',$5,
                                jsonb_build_object('status',$6::text,'version',$7::integer),
                                jsonb_build_object('status',$6::text,'version',$7::integer,'wltPenaltyId',$8::text,'wltLedgerTransactionId',$9::text,'wltStatus',$10::text),
                                $11,$12,$13,$14::uuid)
                        ON CONFLICT (financial_command_id) WHERE financial_command_id IS NOT NULL DO NOTHING`,
			item.OperatorContextID, item.RequestedByActorID, item.RequestedByRole, actorID,
			"provider_penalty_"+item.Operation, currentStatus, currentVersion, remoteID, ledgerID, remoteStatus,
			item.Reason, item.CorrelationID, item.IdempotencyKey, item.ID); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE workforce_provider_penalty_commands
                        SET lifecycle_state='COMPLETED',terminal_disposition='superseded_by_reversal',completed_at=NOW(),
                                lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                        WHERE id=$1::uuid AND lease_token=$2::uuid`, item.ID, item.LeaseToken)
		if err != nil {
			return err
		}
		return tx.Commit()
	}
	if disposition == projectionConflict {
		return fmt.Errorf("%w: operation=%s current=%s@%d source=%d", errProjectionStatusConflict, item.Operation, currentStatus, currentVersion, item.SourceVersion)
	}
	newRef := currentRef
	if remoteID != "" {
		newRef = remoteID
	}
	if _, err := tx.ExecContext(ctx, `UPDATE workforce_provider_incidents SET status=$3,wlt_ledger_reference=$4,
                resolution_note=$5,reviewed_by_actor_id=$6,resolved_at=CASE WHEN $3='reversed' THEN NOW() ELSE NULL END,
                version=version+1,updated_at=NOW() WHERE operator_context_id=$1 AND id=$2::uuid`,
		item.OperatorContextID, item.IncidentID, target, newRef, item.Reason, item.RequestedByActorID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO workforce_provider_incident_transitions(
                operator_context_id,incident_id,actor_id,from_status,to_status,reason,wlt_ledger_reference,
                decided_by_actor_id,incident_version,financial_command_id)
                VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9+1,$10::uuid)
                ON CONFLICT (financial_command_id) WHERE financial_command_id IS NOT NULL DO NOTHING`,
		item.OperatorContextID, item.IncidentID, actorID, currentStatus, target, item.Reason,
		newRef, item.RequestedByActorID, currentVersion, item.ID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO workforce_action_audit(
                operator_context_id,actor_id,actor_role,target_actor_id,action,operation,from_state,to_state,reason,correlation_id,idempotency_key,financial_command_id)
                VALUES($1,$2,$3,$4,'provider.incident.financial_saga_projected',$5,
                        jsonb_build_object('status',$6::text,'version',$7::integer),
                        jsonb_build_object('status',$8::text,'version',$7::integer+1,'wltPenaltyId',$9::text,'wltLedgerTransactionId',$10::text,'wltStatus',$11::text),
                        $12,$13,$14,$15::uuid)
                ON CONFLICT (financial_command_id) WHERE financial_command_id IS NOT NULL DO NOTHING`,
		item.OperatorContextID, item.RequestedByActorID, item.RequestedByRole, actorID,
		"provider_penalty_"+item.Operation, currentStatus, currentVersion, target, remoteID, ledgerID, remoteStatus,
		item.Reason, item.CorrelationID, item.IdempotencyKey, item.ID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE workforce_provider_penalty_commands
                SET lifecycle_state='COMPLETED',remote_penalty_id=CASE WHEN $3='' THEN remote_penalty_id ELSE $3 END,
                        remote_ledger_transaction_id=CASE WHEN $4='' THEN remote_ledger_transaction_id ELSE $4 END,
                        remote_status=$5,terminal_disposition=CASE WHEN $6 THEN 'no_financial_effect' ELSE 'projected' END,
                        completed_at=NOW(),lease_token=NULL,lease_owner=NULL,lease_expires_at=NULL,updated_at=NOW()
                WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='LOCAL_PROJECTION_PENDING'`,
		item.ID, item.LeaseToken, remoteID, ledgerID, remoteStatus, absent); err != nil {
		return err
	}
	return tx.Commit()
}

func errorText(err error) string {
	if err == nil {
		return "provider penalty saga transition failed"
	}
	text := err.Error()
	if len(text) > 2000 {
		return text[:2000]
	}
	return text
}

func processItem(ctx context.Context, db *sql.DB, identity *identityclient.Client, client *wltclient.Client, item command) error {
	if !operatorContextValid(item) {
		return markPermanent(ctx, db, item, "INVALID_OPERATOR_CONTEXT", fmt.Errorf("command OperatorContext no longer matches canonical incident and actor ownership"))
	}
	recoveryOnly := item.NeedsReadback || item.LifecycleState == "REMOTE_CONFIRMED" || item.LifecycleState == "LOCAL_PROJECTION_PENDING"
	identityInvalid := false
	if identity == nil || !identity.Configured() {
		if !recoveryOnly {
			return releaseRetry(ctx, db, item, "IDENTITY_UNAVAILABLE", identityclient.ErrUnavailable)
		}
	} else {
		for _, actorID := range []string{item.RequestedByActorID, item.ProviderActorID} {
			if err := identity.VerifyActorInOperatorContext(ctx, actorID, item.OperatorContextID); err != nil {
				if errors.Is(err, identityclient.ErrOperatorContextForbidden) {
					identityInvalid = true
					if !recoveryOnly {
						return markPermanent(ctx, db, item, "INVALID_OPERATOR_CONTEXT", err)
					}
				} else if !recoveryOnly {
					return releaseRetry(ctx, db, item, "IDENTITY_RETRYABLE", err)
				}
			}
		}
	}
	if item.Operation == "reverse" {
		switch parentDisposition(item.ParentLifecycleState) {
		case "project_absent":
			if strings.HasPrefix(item.TerminalDisposition, "historic_") {
				return reconcileHistoricAbsence(ctx, db, item, fmt.Errorf("historic reversal has no reconciled WLT post authority"))
			}
			if err := project(ctx, db, item, nil, true); err != nil {
				if errors.Is(err, errProjectionStatusConflict) {
					// A live/absent-proven financial fact cannot be terminally
					// rejected because the incident drifted: escalate, stay recoverable.
					return releaseRetry(ctx, db, item, projectionConflictCode(item.Operation, "absent-projection"), err)
				}
				return releaseRetry(ctx, db, item, "LOCAL_PROJECTION_RETRYABLE", err)
			}
			return nil
		case "proceed":
			if item.RemotePenaltyID == "" {
				item.RemotePenaltyID = item.ParentRemotePenaltyID
			}
		default:
			return releaseRetry(ctx, db, item, "PARENT_POST_PENDING", fmt.Errorf("post command has not reached a terminal reconciled state"))
		}
	}
	if item.LifecycleState == "REMOTE_CONFIRMED" || item.LifecycleState == "LOCAL_PROJECTION_PENDING" {
		remote := wltclient.SagaProviderPenalty{ID: item.RemotePenaltyID, IncidentID: item.IncidentID,
			ProviderActorID: item.ProviderActorID, ProviderActorType: item.ProviderActorType,
			PolicyID: item.PolicyID, Status: item.RemoteStatus, LedgerTransactionID: item.RemoteLedgerTransactionID,
			IdempotencyKey: item.IdempotencyKey, ReversalIdempotencyKey: item.IdempotencyKey}
		if err := project(ctx, db, item, &remote, false); err != nil {
			if errors.Is(err, errProjectionStatusConflict) {
				// REMOTE_CONFIRMED fact + impossible projection path: the
				// WLT effect is real, so the command stays recoverable and
				// visible instead of terminally rejected (root #3).
				return releaseProjectionRetry(ctx, db, item, err)
			}
			return releaseProjectionRetry(ctx, db, item, err)
		}
		return nil
	}
	if client == nil || !client.Configured() {
		return releaseRetry(ctx, db, item, "WLT_UNAVAILABLE", wltclient.ErrRetryable)
	}
	callCtx, cancel := context.WithTimeout(auth.WithOperatorContext(ctx, item.OperatorContextID), remoteTimeout)
	defer cancel()
	if item.NeedsReadback {
		var remote wltclient.SagaProviderPenalty
		var err error
		if item.RemotePenaltyID != "" {
			remote, err = client.GetPenalty(callCtx, item.RemotePenaltyID, item.CorrelationID)
		} else {
			remote, err = client.GetPenaltyByIncident(callCtx, item.IncidentID, item.CorrelationID)
		}
		if err != nil {
			switch {
			case errors.Is(err, wltclient.ErrNotFound):
				if strings.HasPrefix(item.TerminalDisposition, "historic_") {
					return reconcileHistoricAbsence(ctx, db, item, err)
				} else if identityInvalid {
					return markPermanent(ctx, db, item, "INVALID_OPERATOR_CONTEXT", fmt.Errorf("identity invalidated the durable command before WLT recorded an effect"))
				} else {
					return markAbsentReady(ctx, db, item)
				}
			case errors.Is(err, wltclient.ErrPermanent):
				return markPermanent(ctx, db, item, "READBACK_PERMANENTLY_REJECTED", err)
			default:
				return markReadbackFailure(ctx, db, item, err)
			}
		}
		if item.Operation == "reverse" && remote.Status != "reversed" {
			if strings.HasPrefix(item.TerminalDisposition, "historic_") {
				return reconcileHistoricAbsence(ctx, db, item, fmt.Errorf("historic reversal is absent; WLT penalty remains %s", remote.Status))
			}
			return markAbsentReady(ctx, db, item)
		}
		if !validRemote(item, remote) && !strings.HasPrefix(item.TerminalDisposition, "historic_") {
			return markPermanent(ctx, db, item, "WLT_IDEMPOTENCY_IDENTITY_MISMATCH", fmt.Errorf("authoritative WLT record does not match the durable command"))
		}
		confirmed, err := markConfirmed(ctx, db, item, remote)
		if err != nil {
			return err
		}
		if !confirmed {
			return fmt.Errorf("provider penalty command %s lost its lease before readback confirmation", item.ID)
		}
		return nil
	}

	var remote wltclient.SagaProviderPenalty
	var err error
	if item.Operation == "post" {
		if item.IncidentStatus != "approved" {
			// Pre-remote: no WLT effect exists yet, so a genuinely
			// superseded incident is a correct terminal rejection. A
			// non-status version bump alone is NOT staleness — the
			// incident is still the approved source of this command.
			return markPermanent(ctx, db, item, "SUPERSEDED_INCIDENT", fmt.Errorf("post source is no longer approved: incident=%s@%d command=%d", item.IncidentStatus, item.IncidentVersion, item.SourceVersion))
		}
		remote, err = client.PostPenaltySaga(callCtx, item.IdempotencyKey, item.CorrelationID, wltclient.PostPenaltyInput{
			IncidentID: item.IncidentID, ProviderActorID: item.ProviderActorID, ProviderActorType: item.ProviderActorType,
			PolicyID: item.PolicyID, Reason: item.Reason, PostedByActorID: item.RequestedByActorID,
		})
	} else {
		remote, err = client.ReversePenaltySaga(callCtx, item.RemotePenaltyID, item.IdempotencyKey, item.CorrelationID, wltclient.ReversePenaltyInput{
			Reason: item.Reason, ReversedByActorID: item.RequestedByActorID,
		})
	}
	if err != nil {
		switch mutationFailureDisposition(err) {
		case "reconcile":
			return markUnknown(ctx, db, item, err)
		case "retry":
			return releaseRetry(ctx, db, item, "WLT_RETRYABLE", err)
		default:
			return markPermanent(ctx, db, item, "WLT_PERMANENTLY_REJECTED", err)
		}
	}
	if !validRemote(item, remote) {
		return markUnknown(ctx, db, item, fmt.Errorf("WLT returned a mismatched command result"))
	}
	confirmed, err := markConfirmed(ctx, db, item, remote)
	if err != nil {
		return err
	}
	if !confirmed {
		return fmt.Errorf("provider penalty command %s lost its lease before remote confirmation", item.ID)
	}
	return nil
}

func ProcessOnce(ctx context.Context, db *sql.DB, identity *identityclient.Client, client *wltclient.Client, owner string) error {
	items, err := claimBatch(ctx, db, owner, batchSize, claimLease)
	if err != nil {
		return err
	}
	var processErrors []error
	for _, item := range items {
		if err := processItem(ctx, db, identity, client, item); err != nil {
			processErrors = append(processErrors, fmt.Errorf("process provider penalty command %s: %w", item.ID, err))
		}
	}
	return errors.Join(processErrors...)
}

func RunWorker(ctx context.Context, db *sql.DB, identity *identityclient.Client, client *wltclient.Client, interval time.Duration) {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	owner := workerID()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOnce(ctx, db, identity, client, owner); err != nil {
				log.Printf("[workforce-provider-penalty-saga] %v", err)
			}
		}
	}
}

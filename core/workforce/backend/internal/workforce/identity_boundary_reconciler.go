package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"workforce-api/internal/identityclient"
)

type claimedIdentityBoundaryCase struct {
	identityBoundaryCase
	Payload      []byte
	RemoteResult []byte
	AttemptCount int
	LeaseToken   string
}

func (r *Repository) claimIdentityBoundaryCases(ctx context.Context, owner string, limit int, lease time.Duration) ([]claimedIdentityBoundaryCase, error) {
	leaseInterval := fmt.Sprintf("%.6f seconds", lease.Seconds())
	rows, err := r.db.QueryContext(ctx, `
		WITH candidates AS (
			SELECT id FROM workforce_provisioning_cases
			WHERE lifecycle_state IN ('INTENT_RECORDED','REMOTE_APPLIED','RETRY_SCHEDULED')
			  AND next_retry_at <= now()
			  AND (lease_expires_at IS NULL OR lease_expires_at <= now())
			ORDER BY next_retry_at, created_at
			LIMIT $1 FOR UPDATE SKIP LOCKED
		)
		UPDATE workforce_provisioning_cases command
		SET lease_token=gen_random_uuid(), lease_owner=$2,
			lease_expires_at=now()+$3::interval, attempt_count=attempt_count+1,
			last_attempt_at=now(), updated_at=now()
		FROM candidates WHERE command.id=candidates.id
		RETURNING command.id::text, command.operator_context_id, command.operation,
			command.workforce_kind, COALESCE(command.actor_id,''), COALESCE(command.workforce_code,''),
			command.request_hash, command.command_idempotency_key,
			command.requested_by_actor_id, command.requested_by_role, command.correlation_id,
			command.payload, command.remote_result, command.attempt_count,
			command.lease_token::text`, limit, owner, leaseInterval)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var result []claimedIdentityBoundaryCase
	for rows.Next() {
		var c claimedIdentityBoundaryCase
		if err := rows.Scan(&c.ID, &c.OperatorContextID, &c.Operation, &c.WorkforceKind,
			&c.ActorID, &c.WorkforceCode, &c.RequestHash, &c.CommandKey,
			&c.RequestedByActorID, &c.RequestedByRole, &c.CorrelationID,
			&c.Payload, &c.RemoteResult, &c.AttemptCount, &c.LeaseToken); err != nil {
			return nil, err
		}
		c.LifecycleState = "IN_FLIGHT"
		result = append(result, c)
	}
	return result, rows.Err()
}

func (r *Repository) releaseIdentityBoundaryCase(ctx context.Context, c claimedIdentityBoundaryCase, code string, cause error) error {
	message := ""
	if cause != nil {
		message = cause.Error()
	}
	result, err := r.db.ExecContext(ctx, `
		UPDATE workforce_provisioning_cases
		SET lifecycle_state='RETRY_SCHEDULED', status='RETRY_SCHEDULED', last_error_code=$2,
			last_error=$3, next_retry_at=now()+$4::interval,
			lease_token=NULL, lease_owner=NULL, lease_expires_at=NULL, updated_at=now()
		WHERE id=$1::uuid AND lease_token=$5::uuid`, c.ID, code, message,
		fmt.Sprintf("%.6f seconds", identityBoundaryRetryAt(c.AttemptCount).Seconds()), c.LeaseToken)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errIdentityBoundaryLeaseLost
	}
	return nil
}

func completeIdentityBoundaryCaseTx(ctx context.Context, tx *sql.Tx, c claimedIdentityBoundaryCase) error {
	result, err := tx.ExecContext(ctx, `
		UPDATE workforce_provisioning_cases
		SET lifecycle_state='LOCAL_COMMITTED', status='COMPLETED', terminal_disposition='local_projection_committed',
			completed_at=now(), lease_token=NULL, lease_owner=NULL, lease_expires_at=NULL, updated_at=now()
		WHERE id=$1::uuid AND lease_token=$2::uuid`, c.ID, c.LeaseToken)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errIdentityBoundaryLeaseLost
	}
	return nil
}

func ProcessIdentityBoundaryRecoveryPass(ctx context.Context, db *sql.DB, identity *identityclient.Client) (int, error) {
	repo := NewRepository(db)
	cases, err := repo.claimIdentityBoundaryCases(ctx, "identity-boundary-reconciler", 10, 90*time.Second)
	if err != nil {
		return 0, err
	}
	for _, c := range cases {
		if err := processIdentityBoundaryCase(ctx, repo, identity, c); err != nil {
			code := "IDENTITY_BOUNDARY_RECONCILIATION_FAILED"
			if identityBoundaryRetryable(err) {
				code = "IDENTITY_BOUNDARY_TRANSIENT"
			}
			if releaseErr := repo.releaseIdentityBoundaryCase(ctx, c, code, err); releaseErr != nil {
				return len(cases), releaseErr
			}
		}
	}
	return len(cases), nil
}

func processIdentityBoundaryCase(ctx context.Context, repo *Repository, identity *identityclient.Client, c claimedIdentityBoundaryCase) error {
	if identity == nil {
		return identityclient.ErrUnavailable
	}
	opCtx := identityBoundaryContext(ctx, c.identityBoundaryCase)
	switch c.Operation {
	case "create_field_agent":
		var payload fieldIdentityBoundaryPayload
		if err := json.Unmarshal(c.Payload, &payload); err != nil {
			return err
		}
		actor, err := identity.Provision(opCtx, identityclient.ProvisionInput{Username: payload.Input.Username, PhoneE164: payload.Input.PhoneE164, Role: "field"})
		if err != nil {
			return err
		}
		c.ActorID = actor.ActorID
		if err := repo.markIdentityBoundaryRemote(opCtx, c.ID, actor.ActorID, c.WorkforceCode, actor); err != nil {
			return err
		}
		return repo.recoverFieldProjection(opCtx, c, payload, actor)
	case "create_captain":
		var payload captainIdentityBoundaryPayload
		if err := json.Unmarshal(c.Payload, &payload); err != nil {
			return err
		}
		actor, err := identity.Provision(opCtx, identityclient.ProvisionInput{Username: payload.Input.Username, PhoneE164: payload.Input.PhoneE164, Role: "captain"})
		if err != nil {
			return err
		}
		c.ActorID = actor.ActorID
		if err := repo.markIdentityBoundaryRemote(opCtx, c.ID, actor.ActorID, c.WorkforceCode, actor); err != nil {
			return err
		}
		return repo.recoverCaptainProjection(opCtx, c, payload, actor)
	case "create_employee", "create_department_employee", "create_sovereign_leader":
		return repo.recoverEmployeeBoundary(opCtx, identity, c)
	case "issue_activation":
		var payload struct {
			ActorID           string `json:"ActorID"`
			ExpectedActorType string `json:"ExpectedActorType"`
			ExpectedSurface   string `json:"ExpectedSurface"`
			IdempotencyKey    string `json:"IdempotencyKey"`
		}
		if err := json.Unmarshal(c.Payload, &payload); err != nil {
			return err
		}
		activation, err := identity.IssueActivation(opCtx, payload.ActorID, c.RequestedByActorID, payload.ExpectedActorType, payload.ExpectedSurface, c.CommandKey, c.CorrelationID)
		if err != nil {
			return err
		}
		return repo.recoverActivationAudit(opCtx, c, activation.ActivationID, "workforce.activation_issued", "issue_activation")
	case "revoke_activation":
		var payload struct {
			ActorID string `json:"ActorID"`
		}
		if err := json.Unmarshal(c.Payload, &payload); err != nil {
			return err
		}
		if err := identity.RevokeActivations(opCtx, payload.ActorID); err != nil {
			return err
		}
		return repo.recoverActivationAudit(opCtx, c, "", "workforce.activation_revoked", "revoke_activation")
	default:
		return fmt.Errorf("unsupported identity boundary operation %q", c.Operation)
	}
}

func (r *Repository) recoverFieldProjection(ctx context.Context, c claimedIdentityBoundaryCase, payload fieldIdentityBoundaryPayload, actor identityclient.ActorView) error {
	if _, err := r.PersonByActorID(ctx, actor.ActorID); err == nil {
		return r.completeIdentityBoundaryCase(ctx, c)
	} else if !errors.Is(err, ErrNotFound) {
		return err
	}
	return r.GovernedWrite(ctx, func(tx *sql.Tx) error {
		person, err := createPersonTx(ctx, tx, actor.ActorID, c.WorkforceCode, payload.ServiceAreaCode, payload.Input)
		if err != nil {
			return err
		}
		if err := recordAuditTx(ctx, tx, auditInput{OperatorContextID: c.OperatorContextID, ActorID: c.RequestedByActorID, ActorRole: c.RequestedByRole, TargetActorID: actor.ActorID, Action: "field_agent.created.recovered", Operation: c.Operation, ToState: person, CorrelationID: c.CorrelationID}); err != nil {
			return err
		}
		return completeIdentityBoundaryCaseTx(ctx, tx, c)
	})
}

func (r *Repository) recoverCaptainProjection(ctx context.Context, c claimedIdentityBoundaryCase, payload captainIdentityBoundaryPayload, actor identityclient.ActorView) error {
	if _, err := r.PersonByActorID(ctx, actor.ActorID); err == nil {
		return r.completeIdentityBoundaryCase(ctx, c)
	} else if !errors.Is(err, ErrNotFound) {
		return err
	}
	return r.GovernedWrite(ctx, func(tx *sql.Tx) error {
		person, err := createCaptainTx(ctx, tx, actor.ActorID, c.WorkforceCode, payload.ServiceAreaCode, payload.Input)
		if err != nil {
			return err
		}
		if err := recordAuditTx(ctx, tx, auditInput{OperatorContextID: c.OperatorContextID, ActorID: c.RequestedByActorID, ActorRole: c.RequestedByRole, TargetActorID: actor.ActorID, Action: "captain.created.recovered", Operation: c.Operation, ToState: person, CorrelationID: c.CorrelationID}); err != nil {
			return err
		}
		return completeIdentityBoundaryCaseTx(ctx, tx, c)
	})
}

func (r *Repository) recoverEmployeeBoundary(ctx context.Context, identity *identityclient.Client, c claimedIdentityBoundaryCase) error {
	var input CreateEmployeeInput
	permissionBundle := "staff"
	if c.Operation == "create_sovereign_leader" {
		var source CreateSovereignLeaderInput
		if err := json.Unmarshal(c.Payload, &source); err != nil {
			return err
		}
		permissionBundle = source.PermissionBundle
		input = CreateEmployeeInput{FullNameAr: source.FullNameAr, FullNameEn: source.FullNameEn, Username: source.Username, PhoneE164: source.PhoneE164, EngagementType: "employee", EngagementStartDate: source.EngagementStartDate, Department: source.Department, Role: source.PositionTitle, OfficeLocation: source.OfficeLocation, SupervisorActorID: source.SupervisorActorID}
	} else {
		var durable employeeIdentityBoundaryPayload
		if err := json.Unmarshal(c.Payload, &durable); err != nil {
			return err
		}
		input = durable.Input
		if durable.PermissionBundle != "" {
			permissionBundle = durable.PermissionBundle
		}
	}
	actor, err := identity.ProvisionEmployee(ctx, identityclient.EmployeeProvisionInput{Username: input.Username, PhoneE164: input.PhoneE164, PermissionBundle: permissionBundle, DepartmentScope: input.Department})
	if err != nil {
		return err
	}
	c.ActorID = actor.ActorID
	if err := r.markIdentityBoundaryRemote(ctx, c.ID, actor.ActorID, c.WorkforceCode, actor); err != nil {
		return err
	}
	if _, err := r.PersonByActorID(ctx, actor.ActorID); err == nil {
		return r.completeIdentityBoundaryCase(ctx, c)
	} else if !errors.Is(err, ErrNotFound) {
		return err
	}
	return r.GovernedWrite(ctx, func(tx *sql.Tx) error {
		person, err := createEmployeeTx(ctx, tx, actor.ActorID, c.WorkforceCode, input)
		if err != nil {
			return err
		}
		if err := recordAuditTx(ctx, tx, auditInput{OperatorContextID: c.OperatorContextID, ActorID: c.RequestedByActorID, ActorRole: c.RequestedByRole, TargetActorID: actor.ActorID, Action: "employee.created.recovered", Operation: c.Operation, ToState: person, CorrelationID: c.CorrelationID}); err != nil {
			return err
		}
		return completeIdentityBoundaryCaseTx(ctx, tx, c)
	})
}

func (r *Repository) recoverActivationAudit(ctx context.Context, c claimedIdentityBoundaryCase, activationID, action, operation string) error {
	return r.GovernedWrite(ctx, func(tx *sql.Tx) error {
		if err := recordAuditTx(ctx, tx, auditInput{OperatorContextID: c.OperatorContextID, ActorID: c.RequestedByActorID, ActorRole: c.RequestedByRole, TargetActorID: c.ActorID, Action: action, Operation: operation, ToState: map[string]string{"activationId": activationID}, CorrelationID: c.CorrelationID}); err != nil {
			return err
		}
		return completeIdentityBoundaryCaseTx(ctx, tx, c)
	})
}

func (r *Repository) completeIdentityBoundaryCase(ctx context.Context, c claimedIdentityBoundaryCase) error {
	return r.GovernedWrite(ctx, func(tx *sql.Tx) error { return completeIdentityBoundaryCaseTx(ctx, tx, c) })
}

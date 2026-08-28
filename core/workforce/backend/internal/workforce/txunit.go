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
)

// Governed write boundary (workforce-027 invariant).
//
// Every material workforce mutation is committed together with its audit
// record and its idempotent response inside exactly ONE database
// transaction. The transaction either commits the mutation AND its evidence
// AND its idempotent result, or commits nothing. A governed write can never
// report failure after any part of its effect has committed, and can never
// commit an effect without durable audit evidence in the same commit.
//
// All tx-scoped workers below are the ONLY writers of workforce_people
// profile data, workforce_action_audit and workforce_idempotency. Service
// code composes them exclusively through Repository.GovernedWrite.

// GovernedWrite executes fn inside one database transaction. fn must perform
// the material mutation AND its audit AND (when the command carries an
// idempotency key) its idempotent response, using only the tx-scoped workers.
func (r *Repository) GovernedWrite(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

// auditInput is the single audit write model. It mirrors the columns of
// workforce_action_audit and the validation contract of migration
// workforce-027: operator context is required, and a material mutation audit
// requires a correlation id except for the explicit exempt actions.
type auditInput struct {
	OperatorContextID string
	ActorID           string
	ActorRole         string
	TargetActorID     string
	Action            string
	Operation         string
	FromState         any
	ToState           any
	Reason            string
	CorrelationID     string
	IdempotencyKey    string
	// LifecycleCommandID optionally links the originating audit row to its
	// durable lifecycle command (workforce-029). Only the originating
	// governed unit sets it; confirmation/reversion audits stay unlinked
	// because the unique index admits exactly one originating row.
	LifecycleCommandID string
}

// recordAuditTx is the single audit writer for governed workforce writes.
// It must only be called inside a GovernedWrite transaction alongside the
// mutation it evidences. Failures propagate so a governed write can never
// commit a mutation without its audit record.
func recordAuditTx(ctx context.Context, tx *sql.Tx, in auditInput) error {
	if in.OperatorContextID == "" {
		return ErrOperatorContextRequired
	}
	if in.CorrelationID == "" && in.Action != "provider.document_linked" && in.Action != "field_agent.self_updated" {
		return errors.New("correlation_id is required for material mutation audit")
	}
	fromJSON, err := marshalNullable(in.FromState)
	if err != nil {
		return err
	}
	toJSON, err := marshalNullable(in.ToState)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
                INSERT INTO workforce_action_audit
                        (operator_context_id, actor_id, actor_role, target_actor_id, action, operation, from_state, to_state, reason, correlation_id, idempotency_key, lifecycle_command_id)
                VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7::jsonb, $8::jsonb, NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''), NULLIF($12,'')::uuid)
                ON CONFLICT (operator_context_id, actor_id, operation, idempotency_key)
                WHERE idempotency_key IS NOT NULL AND BTRIM(idempotency_key) <> '' DO NOTHING`,
		in.OperatorContextID, in.ActorID, in.ActorRole, in.TargetActorID, in.Action, in.Operation,
		fromJSON, toJSON, in.Reason, in.CorrelationID, in.IdempotencyKey, in.LifecycleCommandID)
	return err
}

// storeIdempotentResponseTx persists the governed command's idempotent
// response in the SAME transaction as the mutation it replays. With an empty
// key the command is not idempotent-scoped and storing is skipped.
func storeIdempotentResponseTx(ctx context.Context, tx *sql.Tx, actorID, operation, key, requestHash string, response []byte) error {
	if key == "" {
		return nil
	}
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `
                INSERT INTO workforce_idempotency (operator_context_id, actor_id, operation, idempotency_key, request_hash, response_body)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                ON CONFLICT (actor_id, operation, idempotency_key) DO NOTHING`,
		operatorContextID, actorID, operation, key, requestHash, string(response))
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		// A concurrent governed command stored its response under this key
		// first. Identical request hash -> the stored response is byte-equal
		// to ours and there is nothing to persist; a different hash means two
		// different payloads adopted one key — surfaced as a conflict.
		var storedHash string
		if err := tx.QueryRowContext(ctx, `
			SELECT request_hash FROM workforce_idempotency
			WHERE actor_id=$1 AND operation=$2 AND idempotency_key=$3`,
			actorID, operation, key).Scan(&storedHash); err != nil {
			return err
		}
		if storedHash != requestHash {
			return ErrIdempotencyConflict
		}
	}
	return nil
}

// personByActorIDTx is the tx-scoped readback used by governed writes so the
// returned projection is exactly the committed state of the same transaction.
func personByActorIDTx(ctx context.Context, tx *sql.Tx, actorID string) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	person, err := scanPerson(tx.QueryRowContext(ctx,
		personSelect+` WHERE p.operator_context_id = $1 AND p.actor_id = $2`, operatorContextID, actorID))
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	return person, err
}

// ---- tx-scoped mutation workers (single canonical writers) ----

// createPersonTx provisions the sovereign field profile rows inside a
// governed transaction. Caller audits and stores the idempotent response in
// the same transaction.
func createPersonTx(ctx context.Context, tx *sql.Tx, actorID, workforceCode, cityCode string, input CreateFieldAgentInput) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	if err := validateProjectedCityTx(ctx, tx, cityCode); err != nil {
		return Person{}, err
	}
	_, err = tx.ExecContext(ctx, `
                INSERT INTO workforce_people
                        (operator_context_id, actor_id, full_name_ar, full_name_en, workforce_code, workforce_kind, engagement_type, engagement_start_date, photo_media_ref)
                VALUES ($1, $2, $3, NULLIF($4, ''), $5, 'field', $6, NULLIF($7, '')::date, NULLIF($8, ''))
                ON CONFLICT (actor_id) DO NOTHING`,
		operatorContextID, actorID, input.FullNameAr, input.FullNameEn, workforceCode,
		input.EngagementType, input.EngagementStartDate, input.PhotoMediaRef)
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	documents, err := json.Marshal(nonNil(input.DocumentMediaRefs))
	if err != nil {
		return Person{}, err
	}
	_, err = tx.ExecContext(ctx, `
                INSERT INTO workforce_field_profiles
                        (operator_context_id, actor_id, city_code, service_zone_id, supervisor_actor_id, document_media_refs)
                VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), $6::jsonb)`,
		operatorContextID, actorID, cityCode, input.ServiceZoneID, input.SupervisorActorID, string(documents))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// createCaptainTx provisions the sovereign captain profile rows inside a
// governed transaction.
func createCaptainTx(ctx context.Context, tx *sql.Tx, actorID, workforceCode, cityCode string, input CreateCaptainInput) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	if err := validateProjectedCityTx(ctx, tx, cityCode); err != nil {
		return Person{}, err
	}
	_, err = tx.ExecContext(ctx, `
                INSERT INTO workforce_people
                        (operator_context_id, actor_id, full_name_ar, full_name_en, workforce_code, workforce_kind, engagement_type, engagement_start_date, photo_media_ref)
                VALUES ($1, $2, $3, NULLIF($4, ''), $5, 'captain', $6, NULLIF($7, '')::date, NULLIF($8, ''))
                ON CONFLICT (actor_id) DO NOTHING`,
		operatorContextID, actorID, input.FullNameAr, input.FullNameEn, workforceCode,
		input.EngagementType, input.EngagementStartDate, input.PhotoMediaRef)
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	documents, err := json.Marshal(nonNil(input.DocumentMediaRefs))
	if err != nil {
		return Person{}, err
	}
	licenseStatus := input.LicenseStatus
	if licenseStatus == "" {
		licenseStatus = "missing"
	}
	_, err = tx.ExecContext(ctx, `
                INSERT INTO workforce_captain_profiles
                        (operator_context_id, actor_id, vehicle_type, vehicle_identifier, license_status, license_expires_at,
                         operating_city_code, service_zone_id, operating_scope_code, supervisor_actor_id, document_media_refs)
                VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, NULLIF($6, '')::date,
                        NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''), $11::jsonb)`,
		operatorContextID, actorID, input.VehicleType, input.VehicleIdentifier, licenseStatus, input.LicenseExpiresAt,
		cityCode, input.ServiceZoneID, input.OperatingScopeCode, input.SupervisorActorID, string(documents))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// createEmployeeTx provisions the sovereign employee profile rows inside a
// governed transaction.
func createEmployeeTx(ctx context.Context, tx *sql.Tx, actorID, workforceCode string, input CreateEmployeeInput) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	_, err = tx.ExecContext(ctx, `
                INSERT INTO workforce_people
                        (operator_context_id, actor_id, full_name_ar, full_name_en, workforce_code, workforce_kind, engagement_type, engagement_start_date, photo_media_ref)
                VALUES ($1, $2, $3, NULLIF($4, ''), $5, 'employee', $6, NULLIF($7, '')::date, NULLIF($8, ''))
                ON CONFLICT (actor_id) DO NOTHING`,
		operatorContextID, actorID, input.FullNameAr, input.FullNameEn, workforceCode,
		input.EngagementType, input.EngagementStartDate, input.PhotoMediaRef)
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	documents, err := json.Marshal(nonNil(input.DocumentMediaRefs))
	if err != nil {
		return Person{}, err
	}
	_, err = tx.ExecContext(ctx, `
                INSERT INTO workforce_employee_profiles
                        (operator_context_id, actor_id, department, role, supervisor_actor_id, office_location, document_media_refs)
                VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), $7::jsonb)`,
		operatorContextID, actorID, input.Department, input.Role, input.SupervisorActorID, input.OfficeLocation, string(documents))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// updatePersonTx applies sovereign field edits under optimistic locking
// inside a governed transaction and returns the committed projection.
func updatePersonTx(ctx context.Context, tx *sql.Tx, actorID string, derivedCityCode *string, input UpdateFieldAgentInput) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	var currentVersion int
	err = tx.QueryRowContext(ctx, `
                SELECT version FROM workforce_people WHERE operator_context_id = $1 AND actor_id = $2 FOR UPDATE`, operatorContextID, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	if err != nil {
		return Person{}, err
	}
	if currentVersion != input.ExpectedVersion {
		return Person{}, ErrVersionConflict
	}
	if derivedCityCode != nil {
		if err := validateProjectedCityTx(ctx, tx, *derivedCityCode); err != nil {
			return Person{}, err
		}
	}
	_, err = tx.ExecContext(ctx, `
                UPDATE workforce_people SET
                        full_name_ar = COALESCE($3, full_name_ar),
                        full_name_en = COALESCE(NULLIF($4, ''), full_name_en),
                        engagement_type = COALESCE($5, engagement_type),
                        engagement_start_date = COALESCE(NULLIF($6, '')::date, engagement_start_date),
                        photo_media_ref = COALESCE(NULLIF($7, ''), photo_media_ref),
                        version = version + 1,
                        updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2`,
		operatorContextID, actorID, input.FullNameAr, deref(input.FullNameEn),
		input.EngagementType, deref(input.EngagementStartDate), deref(input.PhotoMediaRef))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	_, err = tx.ExecContext(ctx, `
                UPDATE workforce_field_profiles SET
                        city_code = COALESCE(NULLIF($3, ''), city_code),
                        service_zone_id = COALESCE(NULLIF($4, ''), service_zone_id),
                        supervisor_actor_id = COALESCE(NULLIF($5, ''), supervisor_actor_id),
                        updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2`,
		operatorContextID, actorID, deref(derivedCityCode), deref(input.ServiceZoneID), deref(input.SupervisorActorID))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// updateCaptainTx applies sovereign captain edits under optimistic locking
// inside a governed transaction.
func updateCaptainTx(ctx context.Context, tx *sql.Tx, actorID string, derivedCityCode *string, input UpdateCaptainInput) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	var currentVersion int
	err = tx.QueryRowContext(ctx, `
                SELECT version FROM workforce_people WHERE operator_context_id = $1 AND actor_id = $2 FOR UPDATE`, operatorContextID, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	if err != nil {
		return Person{}, err
	}
	if currentVersion != input.ExpectedVersion {
		return Person{}, ErrVersionConflict
	}
	if derivedCityCode != nil {
		if err := validateProjectedCityTx(ctx, tx, *derivedCityCode); err != nil {
			return Person{}, err
		}
	}
	_, err = tx.ExecContext(ctx, `
                UPDATE workforce_people SET
                        full_name_ar = COALESCE($3, full_name_ar),
                        full_name_en = COALESCE(NULLIF($4, ''), full_name_en),
                        engagement_type = COALESCE($5, engagement_type),
                        engagement_start_date = COALESCE(NULLIF($6, '')::date, engagement_start_date),
                        photo_media_ref = COALESCE(NULLIF($7, ''), photo_media_ref),
                        version = version + 1,
                        updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2`,
		operatorContextID, actorID, input.FullNameAr, deref(input.FullNameEn),
		input.EngagementType, deref(input.EngagementStartDate), deref(input.PhotoMediaRef))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	_, err = tx.ExecContext(ctx, `
                UPDATE workforce_captain_profiles SET
                        vehicle_type = COALESCE(NULLIF($3, ''), vehicle_type),
                        vehicle_identifier = COALESCE(NULLIF($4, ''), vehicle_identifier),
                        license_status = COALESCE(NULLIF($5, ''), license_status),
                        license_expires_at = COALESCE(NULLIF($6, '')::date, license_expires_at),
                        operating_city_code = COALESCE(NULLIF($7, ''), operating_city_code),
                        service_zone_id = COALESCE(NULLIF($8, ''), service_zone_id),
                        operating_scope_code = COALESCE(NULLIF($9, ''), operating_scope_code),
                        supervisor_actor_id = COALESCE(NULLIF($10, ''), supervisor_actor_id),
                        updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2`,
		operatorContextID, actorID, deref(input.VehicleType), deref(input.VehicleIdentifier), deref(input.LicenseStatus),
		deref(input.LicenseExpiresAt), deref(derivedCityCode), deref(input.ServiceZoneID),
		deref(input.OperatingScopeCode), deref(input.SupervisorActorID))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// updateEmployeeTx applies sovereign employee edits under optimistic locking
// inside a governed transaction.
func updateEmployeeTx(ctx context.Context, tx *sql.Tx, actorID string, input UpdateEmployeeInput) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	var currentVersion int
	err = tx.QueryRowContext(ctx, `
                SELECT version FROM workforce_people WHERE operator_context_id = $1 AND actor_id = $2 FOR UPDATE`, operatorContextID, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	if err != nil {
		return Person{}, err
	}
	if currentVersion != input.ExpectedVersion {
		return Person{}, ErrVersionConflict
	}
	_, err = tx.ExecContext(ctx, `
                UPDATE workforce_people SET
                        full_name_ar = COALESCE($3, full_name_ar),
                        full_name_en = COALESCE(NULLIF($4, ''), full_name_en),
                        engagement_type = COALESCE($5, engagement_type),
                        engagement_start_date = COALESCE(NULLIF($6, '')::date, engagement_start_date),
                        photo_media_ref = COALESCE(NULLIF($7, ''), photo_media_ref),
                        version = version + 1,
                        updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2`,
		operatorContextID, actorID, input.FullNameAr, deref(input.FullNameEn),
		input.EngagementType, deref(input.EngagementStartDate), deref(input.PhotoMediaRef))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	_, err = tx.ExecContext(ctx, `
                UPDATE workforce_employee_profiles SET
                        department = COALESCE(NULLIF($3, ''), department),
                        role = COALESCE(NULLIF($4, ''), role),
                        supervisor_actor_id = COALESCE(NULLIF($5, ''), supervisor_actor_id),
                        office_location = COALESCE(NULLIF($6, ''), office_location),
                        updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2`,
		operatorContextID, actorID, deref(input.Department), deref(input.Role), deref(input.SupervisorActorID), deref(input.OfficeLocation))
	if err != nil {
		return Person{}, mapPersonWriteError(err)
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// updateSelfTx applies the provider's own non-sovereign edits inside a
// governed transaction. No version gate: these fields are only ever written
// by their owner.
func updateSelfTx(ctx context.Context, tx *sql.Tx, actorID string, input UpdateSelfInput) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	if input.PhotoMediaRef != nil {
		if _, err = tx.ExecContext(ctx, `
                        UPDATE workforce_people SET photo_media_ref = NULLIF($3, ''), updated_at = now()
                        WHERE operator_context_id = $1 AND actor_id = $2`, operatorContextID, actorID, *input.PhotoMediaRef); err != nil {
			return Person{}, err
		}
	}
	var hasFieldProfile bool
	if err := tx.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM workforce_field_profiles WHERE operator_context_id = $1 AND actor_id = $2)`, operatorContextID, actorID).Scan(&hasFieldProfile); err != nil {
		return Person{}, err
	}
	if !hasFieldProfile {
		if input.EmergencyContactName != nil || input.EmergencyContactPhone != nil ||
			input.PreferredLanguage != nil || input.PolicyConsent != nil {
			return Person{}, ErrInvalidInput
		}
		return personByActorIDTx(ctx, tx, actorID)
	}
	consentClause := "policy_consent_at"
	if input.PolicyConsent != nil && *input.PolicyConsent {
		consentClause = "COALESCE(policy_consent_at, now())"
	}
	result, err := tx.ExecContext(ctx, `
                UPDATE workforce_field_profiles SET
                        emergency_contact_name = COALESCE(NULLIF($3, ''), emergency_contact_name),
                        emergency_contact_phone = COALESCE(NULLIF($4, ''), emergency_contact_phone),
                        preferred_language = COALESCE(NULLIF($5, ''), preferred_language),
                        policy_consent_at = `+consentClause+`,
                        updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2`,
		operatorContextID, actorID, deref(input.EmergencyContactName), deref(input.EmergencyContactPhone),
		deref(input.PreferredLanguage))
	if err != nil {
		return Person{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return Person{}, ErrNotFound
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// setEngagementStatusTx transitions engagement_status under the version guard
// inside a governed transaction and returns the committed projection.
func setEngagementStatusTx(ctx context.Context, tx *sql.Tx, actorID, status string, expectedVersion int) (Person, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return Person{}, err
	}
	result, err := tx.ExecContext(ctx, `
                UPDATE workforce_people
                SET engagement_status = $3, version = version + 1, updated_at = now()
                WHERE operator_context_id = $1 AND actor_id = $2 AND version = $4`, operatorContextID, actorID, status, expectedVersion)
	if err != nil {
		return Person{}, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		if _, lookupErr := personByActorIDTx(ctx, tx, actorID); lookupErr != nil {
			return Person{}, lookupErr
		}
		return Person{}, ErrVersionConflict
	}
	return personByActorIDTx(ctx, tx, actorID)
}

// upsertEmployeeGovernanceTx writes the employee governance profile inside a
// governed transaction under optimistic locking.
func upsertEmployeeGovernanceTx(ctx context.Context, tx *sql.Tx, actorID, operatorID string, input UpsertEmployeeGovernanceInput) (EmployeeGovernanceProfile, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	if err := validateEmployeeGovernanceInput(&input); err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	responsibilityJSON, err := json.Marshal(input.ResponsibilityScopes)
	if err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	departmentsJSON, err := json.Marshal(input.ManagedDepartmentCodes)
	if err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	var employeeExists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workforce_employee_profiles WHERE operator_context_id=$1 AND actor_id=$2)`, operatorContextID, actorID).Scan(&employeeExists); err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	if !employeeExists {
		return EmployeeGovernanceProfile{}, ErrNotFound
	}
	var currentVersion int
	err = tx.QueryRowContext(ctx, `SELECT version FROM workforce_employee_governance WHERE operator_context_id=$1 AND actor_id=$2 FOR UPDATE`, operatorContextID, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		if input.ExpectedVersion != 0 {
			return EmployeeGovernanceProfile{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO workforce_employee_governance(
                        operator_context_id,actor_id,position_title,job_grade,employment_class,guarantee_type,guarantee_status,
                        guarantee_reference,responsibility_scopes,managed_department_codes,notes,updated_by_actor_id)
                        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)`,
			operatorContextID, actorID, input.PositionTitle, input.JobGrade, input.EmploymentClass, input.GuaranteeType,
			input.GuaranteeStatus, input.GuaranteeReference, string(responsibilityJSON),
			string(departmentsJSON), input.Notes, operatorID)
	} else if err != nil {
		return EmployeeGovernanceProfile{}, err
	} else {
		if currentVersion != input.ExpectedVersion {
			return EmployeeGovernanceProfile{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `UPDATE workforce_employee_governance SET
                        position_title=$2,job_grade=$3,employment_class=$4,guarantee_type=$5,
                        guarantee_status=$6,guarantee_reference=$7,responsibility_scopes=$8::jsonb,
                        managed_department_codes=$9::jsonb,notes=$10,updated_by_actor_id=$11,
                        version=version+1,updated_at=now() WHERE operator_context_id=$1 AND actor_id=$2`,
			operatorContextID, actorID, input.PositionTitle, input.JobGrade, input.EmploymentClass, input.GuaranteeType,
			input.GuaranteeStatus, input.GuaranteeReference, string(responsibilityJSON),
			string(departmentsJSON), input.Notes, operatorID)
	}
	if err != nil {
		return EmployeeGovernanceProfile{}, err
	}
	return scanEmployeeGovernance(tx.QueryRowContext(ctx,
		`SELECT `+employeeGovernanceColumns+` FROM workforce_employee_governance WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, actorID))
}

// upsertSovereignAssignmentTx writes the sovereign leadership assignment
// inside a governed transaction under optimistic locking.
func upsertSovereignAssignmentTx(ctx context.Context, tx *sql.Tx, actorID, operatorID string, expectedVersion int, bundle, department, startsOn, endsOn string) (SovereignAssignment, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return SovereignAssignment{}, err
	}
	actorID = strings.TrimSpace(actorID)
	operatorID = strings.TrimSpace(operatorID)
	bundle, bundleErr := normalizeSovereignPermissionBundle(bundle)
	department, err = normalizeSovereignDepartment(department)
	if err != nil || bundleErr != nil || actorID == "" || operatorID == "" || expectedVersion < 0 {
		return SovereignAssignment{}, ErrInvalidInput
	}
	if strings.TrimSpace(startsOn) == "" {
		startsOn = time.Now().UTC().Format("2006-01-02")
	}
	var currentVersion int
	err = tx.QueryRowContext(ctx, `SELECT version FROM workforce_sovereign_leadership_assignments WHERE operator_context_id=$1 AND actor_id=$2 FOR UPDATE`, operatorContextID, actorID).Scan(&currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		if expectedVersion != 0 {
			return SovereignAssignment{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `
                        INSERT INTO workforce_sovereign_leadership_assignments(
                                operator_context_id,actor_id,permission_bundle,department_scope,starts_on,ends_on,
                                assignment_status,created_by_actor_id,updated_by_actor_id)
                        VALUES($1,$2,$3,$4,$5::date,NULLIF($6,'')::date,'active',$7,$7)`,
			operatorContextID, actorID, bundle, department, startsOn, strings.TrimSpace(endsOn), operatorID)
	} else if err != nil {
		return SovereignAssignment{}, err
	} else {
		if currentVersion != expectedVersion {
			return SovereignAssignment{}, ErrVersionConflict
		}
		_, err = tx.ExecContext(ctx, `
                        UPDATE workforce_sovereign_leadership_assignments
                        SET permission_bundle=$2,department_scope=$3,starts_on=$4::date,
                                ends_on=NULLIF($5,'')::date,assignment_status='active',
                                updated_by_actor_id=$6,version=version+1,updated_at=now()
                        WHERE operator_context_id=$7 AND actor_id=$1`, actorID, bundle, department, startsOn, strings.TrimSpace(endsOn), operatorID, operatorContextID)
	}
	if err != nil {
		return SovereignAssignment{}, ErrInvalidInput
	}
	var assignment SovereignAssignment
	err = tx.QueryRowContext(ctx, `SELECT actor_id,permission_bundle,department_scope,starts_on::text,
                COALESCE(ends_on::text,''),assignment_status,created_by_actor_id,
                updated_by_actor_id,version,created_at,updated_at
                FROM workforce_sovereign_leadership_assignments WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, actorID).Scan(
		&assignment.ActorID, &assignment.PermissionBundle, &assignment.DepartmentScope,
		&assignment.StartsOn, &assignment.EndsOn, &assignment.AssignmentStatus,
		&assignment.CreatedByActorID, &assignment.UpdatedByActorID, &assignment.Version,
		&assignment.CreatedAt, &assignment.UpdatedAt,
	)
	if err != nil {
		return SovereignAssignment{}, err
	}
	return assignment, nil
}

// employeeGovernanceVersionTx reads the current governance row version
// inside a governed transaction (0 when the row is absent).
func employeeGovernanceVersionTx(ctx context.Context, tx *sql.Tx, actorID string) (int, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return 0, err
	}
	var version int
	err = tx.QueryRowContext(ctx, `SELECT version FROM workforce_employee_governance WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, actorID).Scan(&version)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return version, err
}

// sovereignAssignmentVersionTx reads the current leadership assignment row
// version inside a governed transaction (0 when the row is absent).
func sovereignAssignmentVersionTx(ctx context.Context, tx *sql.Tx, actorID string) (int, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return 0, err
	}
	var version int
	err = tx.QueryRowContext(ctx, `SELECT version FROM workforce_sovereign_leadership_assignments WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, actorID).Scan(&version)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return version, err
}

// lifecycleCommandInput is the durable intent of one cross-sovereign
// suspend/reactivate command (workforce-029). It is inserted in the SAME
// governed unit as the local status change and its audit, so a crash between
// the local commit and the identity outcome always leaves a recoverable
// command row instead of silent contradictory sovereign states.
type lifecycleCommandInput struct {
	OperatorContextID  string
	ActorID            string
	Operation          string // 'suspend' | 'reactivate'
	FromStatus         string
	ToStatus           string
	PersonVersionAfter int
	Reason             string
	RequestedByActorID string
	RequestedByRole    string
	CorrelationID      string
	IdempotencyKey     string
	NextRetryAt        time.Time // grace window before the reconciler may drive it
}

// insertLifecycleCommandTx persists the lifecycle intent inside the governed
// unit that performs the local status change. The identity replay contract
// (same requested_by/reason/correlation returns success) makes reconciler
// retries with these stored parameters idempotent.
func insertLifecycleCommandTx(ctx context.Context, tx *sql.Tx, in lifecycleCommandInput) (string, error) {
	id := uuid.NewString()
	var nextRetry any
	if !in.NextRetryAt.IsZero() {
		nextRetry = in.NextRetryAt
	}
	_, err := tx.ExecContext(ctx, `
                INSERT INTO workforce_lifecycle_commands (
                        id, operator_context_id, actor_id, operation, from_status, to_status,
                        person_version_after, reason, requested_by_actor_id, requested_by_role,
                        correlation_id, command_idempotency_key, lifecycle_state, next_retry_at
                ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'IN_FLIGHT', COALESCE($13, now()))`,
		id, in.OperatorContextID, in.ActorID, in.Operation, in.FromStatus, in.ToStatus,
		in.PersonVersionAfter, in.Reason, in.RequestedByActorID, in.RequestedByRole,
		in.CorrelationID, in.IdempotencyKey, nextRetry)
	if err != nil {
		return "", err
	}
	return id, nil
}

// markLifecycleCommandTx moves a lifecycle command to a terminal disposition
// (COMPLETED / COMPENSATED / SUPERSEDED / FAILED) inside the governed unit
// that evidences the outcome. When the caller holds a reconciler lease the
// transition is fenced by that lease so two reconciler instances can never
// terminate the same command; the synchronous service path passes a zero UUID
// which matches the initial lease-less row.
func markLifecycleCommandTx(ctx context.Context, tx *sql.Tx, id string, lease uuid.UUID, state, terminalDisposition, errorCode, lastError string) error {
	result, err := tx.ExecContext(ctx, `
                UPDATE workforce_lifecycle_commands
                SET lifecycle_state=$3, terminal_disposition=$4, last_error_code=$5, last_error=$6,
                        remote_confirmed_at=CASE WHEN $3='COMPLETED' THEN now() ELSE remote_confirmed_at END,
                        completed_at=CASE WHEN $3 IN ('COMPLETED','COMPENSATED','SUPERSEDED','FAILED') THEN now() ELSE completed_at END,
                        lease_token=NULL, lease_owner=NULL, lease_expires_at=NULL, updated_at=now()
                WHERE id=$1::uuid AND (lease_token IS NULL OR lease_token=$2::uuid)
                        AND lifecycle_state IN ('IN_FLIGHT','RETRY_SCHEDULED')`,
		id, lease, state, terminalDisposition, errorCode, lastError)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return errLifecycleLeaseLost
	}
	return nil
}

// governedRevertError reports a governed mutation whose remote counterpart
// failed AND whose local compensation also failed. The local state may be
// inconsistent with the remote authority and must be reconciled; the error is
// loud by design and never swallowed.
func governedRevertError(action string, remoteErr, revertErr error) error {
	return fmt.Errorf("%s remote operation failed: %w; local compensation also failed and requires reconciliation: %v", action, remoteErr, revertErr)
}

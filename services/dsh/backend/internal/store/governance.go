package store

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrScopedStoreNotFound = errors.New("scoped store not found")
	ErrVersionConflict     = errors.New("store version conflict")
	ErrIdempotencyConflict = errors.New("idempotency conflict")
)

type StoreActor struct {
	ID        string
	Role      string
	TenantID  string
	PhoneE164 string
}

type StoreScope struct {
	StoreID string
	Type    string
}

var requiredFieldVerificationChecks = []string{
	"location_verified",
	"documents_uploaded",
	"product_list_submitted",
	"equipment_checked",
	"safety_compliant",
	"hygiene_compliant",
}

type StoreAuditEvent struct {
	ID            string         `json:"id"`
	ActorID       string         `json:"actorId"`
	ActorRole     string         `json:"actorRole"`
	StoreID       string         `json:"storeId"`
	Action        string         `json:"action"`
	FromState     map[string]any `json:"fromState"`
	ToState       map[string]any `json:"toState"`
	Reason        string         `json:"reason"`
	CorrelationID string         `json:"correlationId"`
	CreatedAt     time.Time      `json:"createdAt"`
}

type StoreActionResponse struct {
	Store    DshStoreDetail  `json:"store"`
	Audit    StoreAuditEvent `json:"audit"`
	Replayed bool            `json:"replayed"`
}

type PartnerSettingsInput struct {
	ExpectedVersion int      `json:"expectedVersion"`
	Status          string   `json:"status"`
	DeliveryModes   []string `json:"deliveryModes"`
	Reason          string   `json:"reason"`
}

type FieldVerificationInput struct {
	ExpectedVersion int    `json:"expectedVersion"`
	VisitID         string `json:"visitId"`
	Outcome         string `json:"outcome"`
	EvidenceStatus  string `json:"evidenceStatus"`
	Notes           string `json:"notes"`
}

type CaptainReadinessInput struct {
	ExpectedVersion int    `json:"expectedVersion"`
	Readiness       string `json:"readiness"`
	Reason          string `json:"reason"`
}

type OperatorGovernanceInput struct {
	ExpectedVersion int    `json:"expectedVersion"`
	Action          string `json:"action"`
	Value           string `json:"value"`
	Reason          string `json:"reason"`
}

func ResolveActorStore(ctx context.Context, db *sql.DB, actor StoreActor) (*DshStoreRow, StoreScope, error) {
	var scope StoreScope
	err := db.QueryRowContext(ctx, `
		SELECT store_id, scope_type
		FROM dsh_store_actor_scopes
		WHERE actor_id = $1 AND actor_role = $2 AND active = true
		ORDER BY created_at ASC
		LIMIT 1`, actor.ID, actor.Role).Scan(&scope.StoreID, &scope.Type)
	if err == sql.ErrNoRows {
		return nil, StoreScope{}, ErrScopedStoreNotFound
	}
	if err != nil {
		return nil, StoreScope{}, err
	}
	row, err := getStoreByIDContext(ctx, db, scope.StoreID)
	return row, scope, err
}

// ResolveActorStoreForID resolves the actor's store scope for a specific
// storeID when provided, falling back to ResolveActorStore's legacy
// first-scope behavior when storeID is empty. This lets multi-store actors
// (e.g. field agents with several assigned stores) disambiguate which store
// they mean instead of always landing on the oldest scope row.
func ResolveActorStoreForID(ctx context.Context, db *sql.DB, actor StoreActor, storeID string) (*DshStoreRow, StoreScope, error) {
	if storeID == "" {
		return ResolveActorStore(ctx, db, actor)
	}
	var scope StoreScope
	err := db.QueryRowContext(ctx, `
		SELECT store_id, scope_type
		FROM dsh_store_actor_scopes
		WHERE actor_id = $1 AND actor_role = $2 AND store_id = $3 AND active = true`,
		actor.ID, actor.Role, storeID).Scan(&scope.StoreID, &scope.Type)
	if err == sql.ErrNoRows {
		return nil, StoreScope{}, ErrScopedStoreNotFound
	}
	if err != nil {
		return nil, StoreScope{}, err
	}
	row, err := getStoreByIDContext(ctx, db, scope.StoreID)
	return row, scope, err
}

func GetStoreByIDInternal(ctx context.Context, db *sql.DB, storeID string) (*DshStoreRow, error) {
	return getStoreByIDContext(ctx, db, storeID)
}

func ActorCanAccessStore(ctx context.Context, db queryer, actor StoreActor, storeID string) (bool, error) {
	if actor.Role == "operator" {
		return true, nil
	}
	var exists bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM dsh_store_actor_scopes
			WHERE actor_id = $1 AND actor_role = $2 AND store_id = $3 AND active = true
		)`, actor.ID, actor.Role, storeID).Scan(&exists)
	return exists, err
}

func UpdatePartnerSettings(
	ctx context.Context, db *sql.DB, actor StoreActor, storeID, key, correlationID string, input PartnerSettingsInput,
) (StoreActionResponse, error) {
	if input.ExpectedVersion < 1 || strings.TrimSpace(input.Reason) == "" || len(input.DeliveryModes) == 0 {
		return StoreActionResponse{}, fmt.Errorf("invalid partner settings")
	}
	if !validStoreStatus(input.Status) || !validDeliveryModes(input.DeliveryModes) {
		return StoreActionResponse{}, fmt.Errorf("invalid partner settings")
	}
	return runMutation(ctx, db, actor, storeID, "partner.settings.update", key, correlationID, input, input.Reason,
		func(tx *sql.Tx, current DshStoreRow) error {
			if current.Version != input.ExpectedVersion {
				return ErrVersionConflict
			}
			_, err := tx.ExecContext(ctx, `
				UPDATE dsh_stores
				SET status = $1, delivery_modes = $2, version = version + 1, updated_at = now()
				WHERE id = $3 AND version = $4`,
				input.Status, pqArray(input.DeliveryModes), storeID, input.ExpectedVersion)
			return err
		})
}

func SubmitFieldVerification(
	ctx context.Context, db *sql.DB, actor StoreActor, storeID, key, correlationID string, input FieldVerificationInput,
) (StoreActionResponse, error) {
	validOutcome := input.Outcome == "verified" || input.Outcome == "needs_follow_up" || input.Outcome == "rejected"
	if input.ExpectedVersion < 1 || strings.TrimSpace(input.VisitID) == "" || !validOutcome || len(strings.TrimSpace(input.Notes)) < 3 {
		return StoreActionResponse{}, fmt.Errorf("invalid field verification")
	}
	return runMutation(ctx, db, actor, storeID, "field.verification.submit", key, correlationID, input, input.Notes,
		func(tx *sql.Tx, current DshStoreRow) error {
			if current.Version != input.ExpectedVersion {
				return ErrVersionConflict
			}

			var visitStoreID, visitStatus, fieldAgentID string
			err := tx.QueryRowContext(ctx, `
				SELECT store_id, status, field_agent_id FROM dsh_field_visits WHERE id = $1`, input.VisitID).Scan(&visitStoreID, &visitStatus, &fieldAgentID)
			if errors.Is(err, sql.ErrNoRows) {
				return fmt.Errorf("visit not found")
			}
			if err != nil {
				return err
			}
			if visitStoreID != storeID {
				return fmt.Errorf("visit does not belong to this store")
			}
			if actor.Role != "operator" && fieldAgentID != actor.ID {
				return fmt.Errorf("visit not owned by actor")
			}

			checklistSnapshot, locationSnapshot, derivedEvidenceStatus, err := buildFieldVerificationSnapshots(ctx, tx, input.VisitID)
			if err != nil {
				return err
			}

			if input.Outcome == "verified" {
				if visitStatus != "complete" {
					return fmt.Errorf("cannot verify: linked visit is not complete")
				}
				if derivedEvidenceStatus != "complete" {
					return fmt.Errorf("cannot verify: required evidence is incomplete")
				}
				var openCount int
				if err := tx.QueryRowContext(ctx, `
					SELECT COUNT(*) FROM dsh_readiness_escalations
					WHERE visit_id = $1 AND status IN ('open','acknowledged')`, input.VisitID).Scan(&openCount); err != nil {
					return err
				}
				if openCount > 0 {
					return fmt.Errorf("cannot verify: visit has an open escalation")
				}
			}

			id := eventID("field")
			_, err = tx.ExecContext(ctx, `
				INSERT INTO dsh_store_field_verifications
					(id, store_id, actor_id, visit_id, outcome, evidence_status, notes, correlation_id, checklist_snapshot, location_snapshot)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
				id, storeID, actor.ID, input.VisitID, input.Outcome, derivedEvidenceStatus, input.Notes, correlationID, checklistSnapshot, locationSnapshot)
			return err
		})
}

func buildFieldVerificationSnapshots(ctx context.Context, tx *sql.Tx, visitID string) (string, string, string, error) {
	type checkSnapshot struct {
		CheckType        string `json:"checkType"`
		Status           string `json:"status"`
		EvidenceMediaRef string `json:"evidenceMediaRef"`
		Notes            string `json:"notes"`
		EvidenceExists   bool   `json:"evidenceExists"`
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT c.check_type, c.status, COALESCE(c.evidence_url,''), COALESCE(c.notes,''),
		       EXISTS (SELECT 1 FROM dsh_media_refs refs WHERE refs.media_ref = c.evidence_url)
		FROM dsh_readiness_checks c
		WHERE c.visit_id = $1
		ORDER BY c.created_at ASC`, visitID)
	if err != nil {
		return "", "", "", err
	}
	defer rows.Close()

	snapshots := []checkSnapshot{}
	requiredPassedWithEvidence := map[string]bool{}
	anyEvidence := false
	for rows.Next() {
		var snap checkSnapshot
		if err := rows.Scan(&snap.CheckType, &snap.Status, &snap.EvidenceMediaRef, &snap.Notes, &snap.EvidenceExists); err != nil {
			return "", "", "", err
		}
		snapshots = append(snapshots, snap)
		if strings.TrimSpace(snap.EvidenceMediaRef) != "" && snap.EvidenceExists {
			anyEvidence = true
		}
		if snap.Status == "passed" && strings.TrimSpace(snap.EvidenceMediaRef) != "" && snap.EvidenceExists {
			requiredPassedWithEvidence[snap.CheckType] = true
		}
	}
	if err := rows.Err(); err != nil {
		return "", "", "", err
	}

	evidenceStatus := "missing"
	if anyEvidence {
		evidenceStatus = "partial"
	}
	allRequiredComplete := true
	for _, checkType := range requiredFieldVerificationChecks {
		if !requiredPassedWithEvidence[checkType] {
			allRequiredComplete = false
			break
		}
	}
	if allRequiredComplete {
		evidenceStatus = "complete"
	}

	checklistJSON, err := json.Marshal(snapshots)
	if err != nil {
		return "", "", "", err
	}
	locationSnapshot := map[string]any{
		"check": nil,
	}
	for _, snap := range snapshots {
		if snap.CheckType == "location_verified" {
			locationSnapshot["check"] = snap
			break
		}
	}
	locationJSON, err := json.Marshal(locationSnapshot)
	if err != nil {
		return "", "", "", err
	}
	return string(checklistJSON), string(locationJSON), evidenceStatus, nil
}

func ReportCaptainReadiness(
	ctx context.Context, db *sql.DB, actor StoreActor, storeID, key, correlationID string, input CaptainReadinessInput,
) (StoreActionResponse, error) {
	if input.ExpectedVersion < 1 || (input.Readiness != "ready" && input.Readiness != "blocked") || len(strings.TrimSpace(input.Reason)) < 3 {
		return StoreActionResponse{}, fmt.Errorf("invalid pickup readiness")
	}
	return runMutation(ctx, db, actor, storeID, "captain.pickup-readiness.report", key, correlationID, input, input.Reason,
		func(tx *sql.Tx, current DshStoreRow) error {
			if current.Version != input.ExpectedVersion {
				return ErrVersionConflict
			}
			_, err := tx.ExecContext(ctx, `
				INSERT INTO dsh_store_pickup_readiness_reports
					(id, store_id, actor_id, readiness, reason, correlation_id)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				eventID("pickup"), storeID, actor.ID, input.Readiness, input.Reason, correlationID)
			return err
		})
}

func GovernStore(
	ctx context.Context, db *sql.DB, actor StoreActor, storeID, key, correlationID string, input OperatorGovernanceInput,
) (StoreActionResponse, error) {
	if input.ExpectedVersion < 1 || len(strings.TrimSpace(input.Reason)) < 3 {
		return StoreActionResponse{}, fmt.Errorf("invalid governance action")
	}
	return runMutation(ctx, db, actor, storeID, "operator.store.govern", key, correlationID, input, input.Reason,
		func(tx *sql.Tx, current DshStoreRow) error {
			if current.Version != input.ExpectedVersion {
				return ErrVersionConflict
			}
			var query string
			var value any = input.Value
			switch input.Action {
			case "lifecycle":
				if !validStoreStatus(input.Value) {
					return fmt.Errorf("invalid lifecycle value")
				}
				query = `UPDATE dsh_stores SET status = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3`
			case "visibility":
				if input.Value != "visible" && input.Value != "hidden" {
					return fmt.Errorf("invalid visibility value")
				}
				value = input.Value == "visible"
				query = `UPDATE dsh_stores SET is_visible = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3`
			case "serviceability":
				if !validServiceability(input.Value) {
					return fmt.Errorf("invalid serviceability value")
				}
				query = `UPDATE dsh_stores SET serviceability_status = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3`
			case "partner-readiness":
				if input.Value != "pending" && input.Value != "ready" && input.Value != "blocked" {
					return fmt.Errorf("invalid partner readiness value")
				}
				query = `UPDATE dsh_stores SET partner_readiness = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3`
			case "catalog-approval":
				if input.Value != "draft" && input.Value != "submitted" && input.Value != "approved" && input.Value != "rejected" {
					return fmt.Errorf("invalid catalog approval value")
				}
				query = `UPDATE dsh_stores SET catalog_approval_status = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3`
			case "marketing-visibility":
				if input.Value != "visible" && input.Value != "hidden" {
					return fmt.Errorf("invalid marketing visibility value")
				}
				query = `UPDATE dsh_stores SET marketing_visibility = $1, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3`
			default:
				return fmt.Errorf("invalid governance action")
			}
			result, err := tx.ExecContext(ctx, query, value, storeID, input.ExpectedVersion)
			if err != nil {
				return err
			}
			affected, _ := result.RowsAffected()
			if affected != 1 {
				return ErrVersionConflict
			}
			return nil
		})
}

func ListStoreAudit(ctx context.Context, db *sql.DB, storeID string, limit int) ([]StoreAuditEvent, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id, actor_id, actor_role, store_id, action, from_state, to_state, reason, correlation_id, created_at
		FROM dsh_store_action_audit
		WHERE store_id = $1
		ORDER BY created_at DESC LIMIT $2`, storeID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []StoreAuditEvent{}
	for rows.Next() {
		event, err := scanAudit(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

type queryer interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func runMutation(
	ctx context.Context,
	db *sql.DB,
	actor StoreActor,
	storeID, operation, key, correlationID string,
	request any,
	reason string,
	mutate func(*sql.Tx, DshStoreRow) error,
) (StoreActionResponse, error) {
	if len(strings.TrimSpace(key)) < 8 || len(strings.TrimSpace(correlationID)) < 8 {
		return StoreActionResponse{}, fmt.Errorf("idempotency and correlation headers are required")
	}
	allowed, err := ActorCanAccessStore(ctx, db, actor, storeID)
	if err != nil {
		return StoreActionResponse{}, err
	}
	if !allowed {
		return StoreActionResponse{}, ErrScopedStoreNotFound
	}
	requestJSON, err := json.Marshal(request)
	if err != nil {
		return StoreActionResponse{}, err
	}
	requestHash := hashBytes(requestJSON)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return StoreActionResponse{}, err
	}
	defer tx.Rollback()

	var replayHash string
	var replayJSON []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM dsh_store_idempotency
		WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3
		FOR UPDATE`, actor.ID, operation, key).Scan(&replayHash, &replayJSON)
	if err == nil {
		if replayHash != requestHash {
			return StoreActionResponse{}, ErrIdempotencyConflict
		}
		var replay StoreActionResponse
		if err := json.Unmarshal(replayJSON, &replay); err != nil {
			return StoreActionResponse{}, err
		}
		replay.Replayed = true
		return replay, nil
	}
	if err != sql.ErrNoRows {
		return StoreActionResponse{}, err
	}

	current, err := getStoreByIDTx(ctx, tx, storeID, true)
	if err != nil {
		return StoreActionResponse{}, err
	}
	before := storeState(current)
	if err := mutate(tx, *current); err != nil {
		return StoreActionResponse{}, err
	}
	updated, err := getStoreByIDTx(ctx, tx, storeID, true)
	if err != nil {
		return StoreActionResponse{}, err
	}
	after := storeState(updated)
	audit := StoreAuditEvent{
		ID: eventID("audit"), ActorID: actor.ID, ActorRole: actor.Role,
		StoreID: storeID, Action: operation, FromState: before, ToState: after,
		Reason: strings.TrimSpace(reason), CorrelationID: correlationID, CreatedAt: time.Now().UTC(),
	}
	beforeJSON, _ := json.Marshal(before)
	afterJSON, _ := json.Marshal(after)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_store_action_audit
			(id, actor_id, actor_role, store_id, action, from_state, to_state, reason, correlation_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)`,
		audit.ID, audit.ActorID, audit.ActorRole, audit.StoreID, audit.Action,
		string(beforeJSON), string(afterJSON), audit.Reason, audit.CorrelationID, audit.CreatedAt)
	if err != nil {
		return StoreActionResponse{}, err
	}
	response := StoreActionResponse{Store: RowToDetail(*updated), Audit: audit, Replayed: false}
	responseJSON, _ := json.Marshal(response)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_store_idempotency
			(actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		actor.ID, operation, key, requestHash, string(responseJSON))
	if err != nil {
		return StoreActionResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return StoreActionResponse{}, err
	}
	return response, nil
}

func getStoreByIDContext(ctx context.Context, db queryer, storeID string) (*DshStoreRow, error) {
	row, err := scanStore(db.QueryRowContext(ctx, "SELECT "+storeColumns+" FROM dsh_stores WHERE id = $1", storeID))
	if err == sql.ErrNoRows {
		return nil, ErrScopedStoreNotFound
	}
	return &row, err
}

func getStoreByIDTx(ctx context.Context, tx *sql.Tx, storeID string, lock bool) (*DshStoreRow, error) {
	suffix := ""
	if lock {
		suffix = " FOR UPDATE"
	}
	return getStoreByIDContext(ctx, txQueryer{tx}, storeID+suffix)
}

type txQueryer struct{ tx *sql.Tx }

func (q txQueryer) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	if len(args) == 1 {
		if storeID, ok := args[0].(string); ok && strings.HasSuffix(storeID, " FOR UPDATE") {
			args[0] = strings.TrimSuffix(storeID, " FOR UPDATE")
			query += " FOR UPDATE"
		}
	}
	return q.tx.QueryRowContext(ctx, query, args...)
}

func storeState(row *DshStoreRow) map[string]any {
	return map[string]any{
		"status": row.Status, "isVisible": row.IsVisible,
		"serviceability": row.ServiceabilityStatus, "deliveryModes": row.DeliveryModes,
		"partnerReadiness":      row.PartnerReadiness,
		"catalogApprovalStatus": row.CatalogApprovalStatus,
		"marketingVisibility":   row.MarketingVisibility,
		"version":               row.Version,
	}
}

func scanAudit(scanner interface{ Scan(...any) error }) (StoreAuditEvent, error) {
	var event StoreAuditEvent
	var beforeJSON, afterJSON []byte
	err := scanner.Scan(
		&event.ID, &event.ActorID, &event.ActorRole, &event.StoreID, &event.Action,
		&beforeJSON, &afterJSON, &event.Reason, &event.CorrelationID, &event.CreatedAt,
	)
	if err != nil {
		return event, err
	}
	_ = json.Unmarshal(beforeJSON, &event.FromState)
	_ = json.Unmarshal(afterJSON, &event.ToState)
	return event, nil
}

func eventID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

func hashBytes(value []byte) string {
	sum := sha256.Sum256(value)
	return hex.EncodeToString(sum[:])
}

func validStoreStatus(value string) bool {
	return value == string(StatusActive) || value == string(StatusInactive) ||
		value == string(StatusTemporarilyClosed) || value == string(StatusUnavailable)
}

func validServiceability(value string) bool {
	return value == string(ServiceabilityServiceable) || value == string(ServiceabilityLimited) ||
		value == string(ServiceabilityOutOfArea) || value == string(ServiceabilityUnavailable)
}

func validDeliveryModes(values []string) bool {
	for _, value := range values {
		if value != "delivery" && value != "pickup" && value != "express" {
			return false
		}
	}
	return true
}

func pqArray(values []string) any {
	return "{" + strings.Join(values, ",") + "}"
}

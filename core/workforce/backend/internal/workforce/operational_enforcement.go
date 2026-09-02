package workforce

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// PromoteCaptainInput carries the minimum evidence needed for an operations
// decision. Numeric promotion thresholds remain policy-owned; this command
// prevents a bare classification edit with no performance evidence.
type PromoteCaptainInput struct {
	CompletedDeliveries       int      `json:"completedDeliveries"`
	CompletionRateBasisPoints int      `json:"completionRateBasisPoints"`
	SevereIncidentFree        bool     `json:"severeIncidentFree"`
	EvidenceMediaRefs         []string `json:"evidenceMediaRefs"`
	DecisionNote              string   `json:"decisionNote"`
}

type CaptainClassificationDecision struct {
	ID                        string    `json:"id"`
	ActorID                   string    `json:"actorId"`
	FromClassification        string    `json:"fromClassification"`
	ToClassification          string    `json:"toClassification"`
	CompletedDeliveries       int       `json:"completedDeliveries"`
	CompletionRateBasisPoints int       `json:"completionRateBasisPoints"`
	SevereIncidentFree        bool      `json:"severeIncidentFree"`
	EvidenceMediaRefs         []string  `json:"evidenceMediaRefs"`
	DecisionNote              string    `json:"decisionNote"`
	ApprovedByActorID         string    `json:"approvedByActorId"`
	CreatedAt                 time.Time `json:"createdAt"`
}

type TransitionProviderIncidentInput struct {
	ToStatus           string `json:"toStatus"`
	ResolutionNote     string `json:"resolutionNote"`
	WltLedgerReference string `json:"wltLedgerReference"`
	ExpectedVersion    int    `json:"expectedVersion"`
}

type ProviderIncidentTransition struct {
	ID                 string    `json:"id"`
	IncidentID         string    `json:"incidentId"`
	FromStatus         string    `json:"fromStatus"`
	ToStatus           string    `json:"toStatus"`
	ResolutionNote     string    `json:"resolutionNote,omitempty"`
	WltLedgerReference string    `json:"wltLedgerReference,omitempty"`
	ChangedByActorID   string    `json:"changedByActorId"`
	CreatedAt          time.Time `json:"createdAt"`
}

func cleanEvidenceRefs(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	cleaned := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		cleaned = append(cleaned, value)
	}
	return cleaned
}

func validateCaptainPromotionInput(input PromoteCaptainInput) error {
	if input.CompletedDeliveries <= 0 {
		return fmt.Errorf("%w: completed deliveries evidence is required", ErrInvalidInput)
	}
	if input.CompletionRateBasisPoints <= 0 || input.CompletionRateBasisPoints > 10000 {
		return fmt.Errorf("%w: completion rate is invalid", ErrInvalidInput)
	}
	if !input.SevereIncidentFree {
		return fmt.Errorf("%w: captain has a severe incident blocker", ErrInvalidInput)
	}
	if len(cleanEvidenceRefs(input.EvidenceMediaRefs)) == 0 {
		return fmt.Errorf("%w: promotion evidence is required", ErrInvalidInput)
	}
	if len(strings.TrimSpace(input.DecisionNote)) < 3 {
		return fmt.Errorf("%w: promotion decision note is required", ErrInvalidInput)
	}
	return nil
}

// PromoteCaptainToBasic is idempotent after a successful promotion. The
// history row is inserted before the classification update so the database
// trigger can prove the update is evidence-backed within the same transaction.
func (r *Repository) PromoteCaptainToBasic(ctx context.Context, actorID, operatorID, operatorRole, correlationID, idempotencyKey string, input PromoteCaptainInput) (ProviderOperationalCore, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	actorID = strings.TrimSpace(actorID)
	operatorID = strings.TrimSpace(operatorID)
	if actorID == "" || operatorID == "" {
		return ProviderOperationalCore{}, ErrInvalidInput
	}
	input.EvidenceMediaRefs = cleanEvidenceRefs(input.EvidenceMediaRefs)
	input.DecisionNote = strings.TrimSpace(input.DecisionNote)
	if err := validateCaptainPromotionInput(input); err != nil {
		return ProviderOperationalCore{}, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var current, trainingStatus, accreditationStatus, engagementStatus string
	if err := tx.QueryRowContext(ctx, `
		SELECT activation.classification,activation.training_status,
			activation.operations_accreditation_status,person.engagement_status
		FROM workforce_captain_activation_core activation
		JOIN workforce_people person ON person.operator_context_id=activation.operator_context_id AND person.actor_id=activation.actor_id
		WHERE activation.operator_context_id=$1 AND activation.actor_id=$2
		FOR UPDATE OF activation,person`, operatorContextID, actorID).Scan(
		&current, &trainingStatus, &accreditationStatus, &engagementStatus,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ProviderOperationalCore{}, ErrNotFound
		}
		return ProviderOperationalCore{}, err
	}
	if current == "basic" {
		if err := tx.Commit(); err != nil {
			return ProviderOperationalCore{}, err
		}
		return r.OperationalCoreByActorID(ctx, actorID)
	}
	if current != "joker" {
		return ProviderOperationalCore{}, fmt.Errorf("%w: unsupported captain classification", ErrInvalidInput)
	}
	if engagementStatus != "active" {
		return ProviderOperationalCore{}, fmt.Errorf("%w: captain engagement must be active before promotion", ErrInvalidInput)
	}
	if trainingStatus != "passed" || accreditationStatus != "approved" {
		return ProviderOperationalCore{}, fmt.Errorf("%w: captain training and operations accreditation are required", ErrInvalidInput)
	}

	evidenceJSON, err := json.Marshal(input.EvidenceMediaRefs)
	if err != nil {
		return ProviderOperationalCore{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO workforce_captain_classification_history(
			operator_context_id,actor_id,from_classification,to_classification,evidence,
			reason,decided_by_actor_id,idempotency_key
		) VALUES($1,$2,'joker','basic',jsonb_build_object(
			'completedDeliveries',$3,
			'completionRateBasisPoints',$4,
			'severeIncidentFree',$5,
			'evidenceMediaRefs',$6::jsonb
		),$7,$8,'promotion:' || $2 || ':' || gen_random_uuid()::text)`,
		operatorContextID, actorID, input.CompletedDeliveries, input.CompletionRateBasisPoints,
		input.SevereIncidentFree, string(evidenceJSON), input.DecisionNote, operatorID); err != nil {
		return ProviderOperationalCore{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE workforce_captain_activation_core
		SET classification='basic',classification_updated_at=now(),updated_by_actor_id=$3,
			version=version+1,updated_at=now()
		WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, actorID, operatorID); err != nil {
		return ProviderOperationalCore{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProviderOperationalCore{}, err
	}
	return r.OperationalCoreByActorID(ctx, actorID)
}

func allowedProviderIncidentTransition(fromStatus, toStatus string) bool {
	allowed := map[string]map[string]bool{
		"reported":                {"under_review": true, "provider_notified": true, "rejected": true},
		"under_review":            {"provider_notified": true, "appeal_window": true, "approved": true, "rejected": true},
		"provider_notified":       {"appeal_window": true, "approved": true, "rejected": true, "under_review": true},
		"appeal_window":           {"under_review": true, "approved": true, "rejected": true},
		"approved":                {"under_review": true, "financial_action_posted": true, "closed": true, "reversed": true},
		"financial_action_posted": {"closed": true, "reversed": true},
		"rejected":                {"closed": true},
		"reversed":                {"closed": true},
	}
	return allowed[fromStatus][toStatus]
}

func incidentResolutionRequired(status string) bool {
	return oneOf(status, "approved", "rejected", "financial_action_posted", "closed", "reversed")
}

// TransitionProviderIncident applies the operational decision only. A monetary
// debit is never created here; financial_action_posted is accepted only after
// WLT has returned a ledger reference.
func (r *Repository) TransitionProviderIncident(ctx context.Context, incidentID, operatorID, operatorRole, correlationID, idempotencyKey string, input TransitionProviderIncidentInput) (ProviderIncident, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderIncident{}, err
	}
	incidentID = strings.TrimSpace(incidentID)
	operatorID = strings.TrimSpace(operatorID)
	input.ToStatus = strings.TrimSpace(input.ToStatus)
	input.ResolutionNote = strings.TrimSpace(input.ResolutionNote)
	input.WltLedgerReference = strings.TrimSpace(input.WltLedgerReference)
	if incidentID == "" || operatorID == "" || input.ToStatus == "" {
		return ProviderIncident{}, ErrInvalidInput
	}
	if input.ExpectedVersion <= 0 {
		return ProviderIncident{}, fmt.Errorf("%w: expectedVersion is required", ErrInvalidInput)
	}
	if incidentResolutionRequired(input.ToStatus) && len(input.ResolutionNote) < 3 {
		return ProviderIncident{}, fmt.Errorf("%w: resolution note is required", ErrInvalidInput)
	}
	if input.ToStatus == "financial_action_posted" && input.WltLedgerReference == "" {
		return ProviderIncident{}, fmt.Errorf("%w: WLT ledger reference is required", ErrInvalidInput)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderIncident{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var actorID, currentStatus string
	var currentVersion int
	if err := tx.QueryRowContext(ctx, `
		SELECT actor_id,status,version
		FROM workforce_provider_incidents
		WHERE id=$1::uuid AND operator_context_id=$2
		FOR UPDATE`, incidentID, operatorContextID).Scan(&actorID, &currentStatus, &currentVersion); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ProviderIncident{}, ErrNotFound
		}
		return ProviderIncident{}, err
	}
	if currentVersion != input.ExpectedVersion {
		return ProviderIncident{}, ErrVersionConflict
	}
	if currentStatus == input.ToStatus {
		if err := tx.Commit(); err != nil {
			return ProviderIncident{}, err
		}
		return r.ProviderIncidentByID(ctx, incidentID, actorID)
	}
	if !allowedProviderIncidentTransition(currentStatus, input.ToStatus) {
		return ProviderIncident{}, fmt.Errorf("%w: invalid incident transition %s -> %s", ErrInvalidInput, currentStatus, input.ToStatus)
	}

	resolved := oneOf(input.ToStatus, "rejected", "closed", "reversed")
	if _, err := tx.ExecContext(ctx, `
		UPDATE workforce_provider_incidents
		SET status=$2,
			resolution_note=CASE WHEN $3='' THEN resolution_note ELSE $3 END,
			wlt_ledger_reference=CASE WHEN $4='' THEN wlt_ledger_reference ELSE $4 END,
			reviewed_by_actor_id=$5,
			resolved_at=CASE WHEN $6 THEN now() ELSE NULL END,
			version=version+1,updated_at=now()
		WHERE id=$1::uuid AND operator_context_id=$7`, incidentID, input.ToStatus, input.ResolutionNote,
		input.WltLedgerReference, operatorID, resolved, operatorContextID); err != nil {
		return ProviderIncident{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO workforce_provider_incident_transitions(
			operator_context_id,incident_id,actor_id,from_status,to_status,reason,wlt_ledger_reference,decided_by_actor_id,incident_version
		) SELECT $1, incident.id, incident.actor_id, $2, $3, $4, $5, $6, incident.version
		FROM workforce_provider_incidents incident
		WHERE incident.id=$7::uuid AND incident.operator_context_id=$1`, operatorContextID, currentStatus, input.ToStatus,
		input.ResolutionNote, input.WltLedgerReference, operatorID, incidentID); err != nil {
		return ProviderIncident{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProviderIncident{}, err
	}
	return r.ProviderIncidentByID(ctx, incidentID, actorID)
}

func (r *Repository) ListProviderIncidentTransitions(ctx context.Context, incidentID string) ([]ProviderIncidentTransition, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text,incident_id::text,from_status,to_status,reason,
			wlt_ledger_reference,decided_by_actor_id,created_at
		FROM workforce_provider_incident_transitions
		WHERE operator_context_id=$1 AND incident_id=$2::uuid
		ORDER BY created_at ASC`, operatorContextID, strings.TrimSpace(incidentID))
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	items := make([]ProviderIncidentTransition, 0)
	for rows.Next() {
		var item ProviderIncidentTransition
		if err := rows.Scan(&item.ID, &item.IncidentID, &item.FromStatus, &item.ToStatus,
			&item.ResolutionNote, &item.WltLedgerReference, &item.ChangedByActorID, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

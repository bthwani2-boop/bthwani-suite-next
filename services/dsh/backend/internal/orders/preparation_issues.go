package orders

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type PreparationIssueKind string

type PreparationIssueStatus string

type PreparationIssueCustomerDecision string

const (
	PreparationIssueMissingItem          PreparationIssueKind = "missing_item"
	PreparationIssueSubstitutionRequired PreparationIssueKind = "substitution_required"
	PreparationIssueQuality              PreparationIssueKind = "quality_issue"
	PreparationIssueOther                PreparationIssueKind = "other"

	PreparationIssueOpen     PreparationIssueStatus = "open"
	PreparationIssueResolved PreparationIssueStatus = "resolved"

	PreparationIssueDecisionNotRequired PreparationIssueCustomerDecision = "not_required"
	PreparationIssueDecisionPending     PreparationIssueCustomerDecision = "pending"
	PreparationIssueDecisionApproved    PreparationIssueCustomerDecision = "approved"
	PreparationIssueDecisionRejected    PreparationIssueCustomerDecision = "rejected"
)

type PreparationIssue struct {
	ID                       string                           `json:"id"`
	OrderID                  string                           `json:"orderId"`
	StoreID                  string                           `json:"storeId"`
	OrderItemID              string                           `json:"orderItemId"`
	Kind                     PreparationIssueKind             `json:"kind"`
	Status                   PreparationIssueStatus           `json:"status"`
	AffectedQuantity         int                              `json:"affectedQuantity"`
	Note                     string                           `json:"note"`
	ReplacementProductID     string                           `json:"replacementProductId"`
	ReplacementProductName   string                           `json:"replacementProductName"`
	CustomerDecision         PreparationIssueCustomerDecision `json:"customerDecision"`
	CustomerDecidedByActorID string                           `json:"customerDecidedByActorId"`
	CustomerDecisionNote     string                           `json:"customerDecisionNote"`
	CustomerDecidedAt        *time.Time                       `json:"customerDecidedAt"`
	OpenedByActorID          string                           `json:"openedByActorId"`
	OpenedAt                 time.Time                        `json:"openedAt"`
	ResolvedByActorID        string                           `json:"resolvedByActorId"`
	ResolutionNote           string                           `json:"resolutionNote"`
	ResolvedAt               *time.Time                       `json:"resolvedAt"`
	Version                  int                              `json:"version"`
	CreatedAt                time.Time                        `json:"createdAt"`
	UpdatedAt                time.Time                        `json:"updatedAt"`
}

type CreatePreparationIssueInput struct {
	OrderID                string
	StoreID                string
	OrderItemID            string
	ActorID                string
	Kind                   PreparationIssueKind
	AffectedQuantity       int
	Note                   string
	ReplacementProductID   string
	ReplacementProductName string
	CorrelationID          string
}

type DecidePreparationIssueInput struct {
	IssueID         string
	OrderID         string
	ActorID         string
	ExpectedVersion int
	Decision        PreparationIssueCustomerDecision
	Note            string
	CorrelationID   string
}

type ResolvePreparationIssueInput struct {
	IssueID         string
	OrderID         string
	StoreID         string
	ActorID         string
	ExpectedVersion int
	ResolutionNote  string
	CorrelationID   string
}

type preparationIssueScanner interface {
	Scan(dest ...any) error
}

const preparationIssueColumns = `
	id::text,
	order_id::text,
	store_id,
	COALESCE(order_item_id::text, ''),
	issue_kind,
	status,
	affected_quantity,
	note,
	COALESCE(replacement_product_id, ''),
	COALESCE(replacement_product_name, ''),
	customer_decision,
	COALESCE(customer_decided_by_actor_id, ''),
	COALESCE(customer_decision_note, ''),
	customer_decided_at,
	opened_by_actor_id,
	opened_at,
	COALESCE(resolved_by_actor_id, ''),
	COALESCE(resolution_note, ''),
	resolved_at,
	version,
	created_at,
	updated_at`

func scanPreparationIssue(scanner preparationIssueScanner) (*PreparationIssue, error) {
	var issue PreparationIssue
	if err := scanner.Scan(
		&issue.ID,
		&issue.OrderID,
		&issue.StoreID,
		&issue.OrderItemID,
		&issue.Kind,
		&issue.Status,
		&issue.AffectedQuantity,
		&issue.Note,
		&issue.ReplacementProductID,
		&issue.ReplacementProductName,
		&issue.CustomerDecision,
		&issue.CustomerDecidedByActorID,
		&issue.CustomerDecisionNote,
		&issue.CustomerDecidedAt,
		&issue.OpenedByActorID,
		&issue.OpenedAt,
		&issue.ResolvedByActorID,
		&issue.ResolutionNote,
		&issue.ResolvedAt,
		&issue.Version,
		&issue.CreatedAt,
		&issue.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &issue, nil
}

func validPreparationIssueKind(kind PreparationIssueKind) bool {
	switch kind {
	case PreparationIssueMissingItem,
		PreparationIssueSubstitutionRequired,
		PreparationIssueQuality,
		PreparationIssueOther:
		return true
	default:
		return false
	}
}

func validPreparationIssueDecision(decision PreparationIssueCustomerDecision) bool {
	return decision == PreparationIssueDecisionApproved || decision == PreparationIssueDecisionRejected
}

func normalizeCreatePreparationIssueInput(input CreatePreparationIssueInput) CreatePreparationIssueInput {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.OrderItemID = strings.TrimSpace(input.OrderItemID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Note = strings.TrimSpace(input.Note)
	input.ReplacementProductID = strings.TrimSpace(input.ReplacementProductID)
	input.ReplacementProductName = strings.TrimSpace(input.ReplacementProductName)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	return input
}

func ListPreparationIssues(db *sql.DB, orderID string) ([]PreparationIssue, error) {
	orderID = strings.TrimSpace(orderID)
	if db == nil || orderID == "" {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT `+preparationIssueColumns+`
		FROM dsh_order_preparation_issues
		WHERE order_id=$1::uuid
		ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	issues := make([]PreparationIssue, 0)
	for rows.Next() {
		issue, scanErr := scanPreparationIssue(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		issues = append(issues, *issue)
	}
	return issues, rows.Err()
}

func GetPreparationIssue(db *sql.DB, issueID, orderID string) (*PreparationIssue, error) {
	issueID = strings.TrimSpace(issueID)
	orderID = strings.TrimSpace(orderID)
	if db == nil || issueID == "" || orderID == "" {
		return nil, ErrInvalid
	}
	issue, err := scanPreparationIssue(db.QueryRow(`
		SELECT `+preparationIssueColumns+`
		FROM dsh_order_preparation_issues
		WHERE id=$1::uuid AND order_id=$2::uuid`, issueID, orderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return issue, err
}

func CountOpenPreparationIssues(db *sql.DB, orderID string) (int, error) {
	orderID = strings.TrimSpace(orderID)
	if db == nil || orderID == "" {
		return 0, ErrInvalid
	}
	var count int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_order_preparation_issues
		WHERE order_id=$1::uuid AND status='open'`, orderID).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func countOpenPreparationIssuesTx(tx *sql.Tx, orderID string) (int, error) {
	var count int
	if err := tx.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_order_preparation_issues
		WHERE order_id=$1::uuid AND status='open'`, orderID).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func CreatePreparationIssue(db *sql.DB, rawInput CreatePreparationIssueInput) (*PreparationIssue, error) {
	input := normalizeCreatePreparationIssueInput(rawInput)
	if db == nil || input.OrderID == "" || input.StoreID == "" || input.ActorID == "" ||
		!validPreparationIssueKind(input.Kind) || input.AffectedQuantity < 1 ||
		len(input.Note) < 3 || len(input.Note) > 500 || input.CorrelationID == "" {
		return nil, ErrInvalid
	}
	if input.Kind != PreparationIssueOther && input.OrderItemID == "" {
		return nil, fmt.Errorf("%w: order item is required for item preparation issues", ErrInvalid)
	}
	if input.Kind == PreparationIssueSubstitutionRequired &&
		input.ReplacementProductID == "" && len(input.ReplacementProductName) < 2 {
		return nil, fmt.Errorf("%w: replacement product is required", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var actualStoreID string
	var status OrderStatus
	if err := tx.QueryRow(`
		SELECT store_id,status
		FROM dsh_orders
		WHERE id=$1::uuid
		FOR UPDATE`, input.OrderID).Scan(&actualStoreID, &status); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if actualStoreID != input.StoreID {
		return nil, ErrNotFound
	}
	if status != StatusStoreAccepted && status != StatusPreparing {
		return nil, fmt.Errorf("%w: preparation issue cannot be opened from %s", ErrConflict, status)
	}

	if input.OrderItemID != "" {
		var orderedQuantity int
		if err := tx.QueryRow(`
			SELECT quantity
			FROM dsh_order_items
			WHERE id=$1::uuid AND order_id=$2::uuid`, input.OrderItemID, input.OrderID).Scan(&orderedQuantity); errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		} else if err != nil {
			return nil, err
		}
		if input.AffectedQuantity > orderedQuantity {
			return nil, fmt.Errorf("%w: affected quantity exceeds ordered quantity", ErrInvalid)
		}
	}

	if replay, replayErr := scanPreparationIssue(tx.QueryRow(`
		SELECT `+preparationIssueColumns+`
		FROM dsh_order_preparation_issues
		WHERE order_id=$1::uuid AND correlation_id=$2`, input.OrderID, input.CorrelationID)); replayErr == nil {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return replay, nil
	} else if !errors.Is(replayErr, sql.ErrNoRows) {
		return nil, replayErr
	}

	var duplicateOpen bool
	if err := tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM dsh_order_preparation_issues
			WHERE order_id=$1::uuid
			  AND order_item_id IS NOT DISTINCT FROM NULLIF($2,'')::uuid
			  AND issue_kind=$3
			  AND status='open'
		)`, input.OrderID, input.OrderItemID, string(input.Kind)).Scan(&duplicateOpen); err != nil {
		return nil, err
	}
	if duplicateOpen {
		return nil, fmt.Errorf("%w: matching preparation issue is already open", ErrConflict)
	}

	issue, err := scanPreparationIssue(tx.QueryRow(`
		INSERT INTO dsh_order_preparation_issues(
			order_id,store_id,order_item_id,issue_kind,affected_quantity,note,
			replacement_product_id,replacement_product_name,customer_decision,
			opened_by_actor_id,correlation_id)
		VALUES(
			$1::uuid,$2,NULLIF($3,'')::uuid,$4,$5,$6,NULLIF($7,''),NULLIF($8,''),
			CASE WHEN $4='substitution_required' THEN 'pending' ELSE 'not_required' END,
			$9,$10
		)
		RETURNING `+preparationIssueColumns,
		input.OrderID,
		input.StoreID,
		input.OrderItemID,
		string(input.Kind),
		input.AffectedQuantity,
		input.Note,
		input.ReplacementProductID,
		input.ReplacementProductName,
		input.ActorID,
		input.CorrelationID,
	))
	if err != nil {
		return nil, err
	}
	payload, _ := json.Marshal(map[string]any{
		"issueId":           issue.ID,
		"orderId":           issue.OrderID,
		"storeId":           issue.StoreID,
		"kind":              issue.Kind,
		"orderItemId":       issue.OrderItemID,
		"affectedQuantity":  issue.AffectedQuantity,
		"customerDecision":  issue.CustomerDecision,
		"replacementProduct": issue.ReplacementProductName,
	})
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_preparation_issue_events(
			issue_id,order_id,store_id,actor_id,event_type,to_status,note,payload,correlation_id)
		VALUES($1::uuid,$2::uuid,$3,$4,'opened','open',$5,$6::jsonb,$7)`,
		issue.ID, issue.OrderID, issue.StoreID, input.ActorID, input.Note, string(payload), input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events(event_type,entity_type,entity_id,payload,correlation_id)
		VALUES('order.preparation_issue_opened','order',$1,$2::jsonb,$3)`,
		input.OrderID, string(payload), input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return issue, nil
}

func DecidePreparationIssue(db *sql.DB, input DecidePreparationIssueInput) (*PreparationIssue, error) {
	input.IssueID = strings.TrimSpace(input.IssueID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Note = strings.TrimSpace(input.Note)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if db == nil || input.IssueID == "" || input.OrderID == "" || input.ActorID == "" ||
		input.ExpectedVersion < 1 || !validPreparationIssueDecision(input.Decision) ||
		len(input.Note) > 500 || input.CorrelationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := scanPreparationIssue(tx.QueryRow(`
		SELECT `+preparationIssueColumns+`
		FROM dsh_order_preparation_issues
		WHERE id=$1::uuid AND order_id=$2::uuid
		FOR UPDATE`, input.IssueID, input.OrderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	var replayed bool
	if err := tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM dsh_order_preparation_issue_events
			WHERE issue_id=$1::uuid AND correlation_id=$2
		)`, input.IssueID, input.CorrelationID).Scan(&replayed); err != nil {
		return nil, err
	}
	if replayed {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetPreparationIssue(db, input.IssueID, input.OrderID)
	}
	if current.Kind != PreparationIssueSubstitutionRequired ||
		current.Status != PreparationIssueOpen ||
		current.CustomerDecision != PreparationIssueDecisionPending ||
		current.Version != input.ExpectedVersion {
		return nil, ErrConflict
	}

	decided, err := scanPreparationIssue(tx.QueryRow(`
		UPDATE dsh_order_preparation_issues
		SET customer_decision=$3,
		    customer_decided_by_actor_id=$4,
		    customer_decision_note=NULLIF($5,''),
		    customer_decided_at=NOW(),
		    version=version+1,
		    updated_at=NOW()
		WHERE id=$1::uuid AND order_id=$2::uuid
		  AND issue_kind='substitution_required'
		  AND status='open'
		  AND customer_decision='pending'
		  AND version=$6
		RETURNING `+preparationIssueColumns,
		input.IssueID,
		input.OrderID,
		string(input.Decision),
		input.ActorID,
		input.Note,
		input.ExpectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	payload, _ := json.Marshal(map[string]any{
		"issueId":          decided.ID,
		"orderId":          decided.OrderID,
		"storeId":          decided.StoreID,
		"customerDecision": decided.CustomerDecision,
		"version":          decided.Version,
	})
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_preparation_issue_events(
			issue_id,order_id,store_id,actor_id,event_type,from_status,to_status,note,payload,correlation_id)
		VALUES($1::uuid,$2::uuid,$3,$4,'customer_decision','open','open',$5,$6::jsonb,$7)`,
		decided.ID,
		decided.OrderID,
		decided.StoreID,
		input.ActorID,
		string(input.Decision),
		string(payload),
		input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events(event_type,entity_type,entity_id,payload,correlation_id)
		VALUES('order.preparation_issue_customer_decided','order',$1,$2::jsonb,$3)`,
		input.OrderID, string(payload), input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return decided, nil
}

func ResolvePreparationIssue(db *sql.DB, input ResolvePreparationIssueInput) (*PreparationIssue, error) {
	input.IssueID = strings.TrimSpace(input.IssueID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ResolutionNote = strings.TrimSpace(input.ResolutionNote)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if db == nil || input.IssueID == "" || input.OrderID == "" || input.StoreID == "" ||
		input.ActorID == "" || input.ExpectedVersion < 1 || len(input.ResolutionNote) < 3 ||
		len(input.ResolutionNote) > 500 || input.CorrelationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := scanPreparationIssue(tx.QueryRow(`
		SELECT `+preparationIssueColumns+`
		FROM dsh_order_preparation_issues
		WHERE id=$1::uuid AND order_id=$2::uuid
		FOR UPDATE`, input.IssueID, input.OrderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if current.StoreID != input.StoreID {
		return nil, ErrNotFound
	}

	var replayed bool
	if err := tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM dsh_order_preparation_issue_events
			WHERE issue_id=$1::uuid AND correlation_id=$2
		)`, input.IssueID, input.CorrelationID).Scan(&replayed); err != nil {
		return nil, err
	}
	if replayed {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetPreparationIssue(db, input.IssueID, input.OrderID)
	}
	if current.Status != PreparationIssueOpen || current.Version != input.ExpectedVersion {
		return nil, ErrConflict
	}
	if current.Kind == PreparationIssueSubstitutionRequired &&
		current.CustomerDecision == PreparationIssueDecisionPending {
		return nil, fmt.Errorf("%w: customer substitution decision is still pending", ErrConflict)
	}

	resolved, err := scanPreparationIssue(tx.QueryRow(`
		UPDATE dsh_order_preparation_issues
		SET status='resolved',
		    resolved_by_actor_id=$4,
		    resolution_note=$5,
		    resolved_at=NOW(),
		    version=version+1,
		    updated_at=NOW()
		WHERE id=$1::uuid AND order_id=$2::uuid AND store_id=$3
		  AND status='open' AND version=$6
		RETURNING `+preparationIssueColumns,
		input.IssueID,
		input.OrderID,
		input.StoreID,
		input.ActorID,
		input.ResolutionNote,
		input.ExpectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	payload, _ := json.Marshal(map[string]any{
		"issueId":          resolved.ID,
		"orderId":          resolved.OrderID,
		"storeId":          resolved.StoreID,
		"status":           resolved.Status,
		"customerDecision": resolved.CustomerDecision,
		"version":          resolved.Version,
	})
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_preparation_issue_events(
			issue_id,order_id,store_id,actor_id,event_type,from_status,to_status,note,payload,correlation_id)
		VALUES($1::uuid,$2::uuid,$3,$4,'resolved','open','resolved',$5,$6::jsonb,$7)`,
		resolved.ID,
		resolved.OrderID,
		resolved.StoreID,
		input.ActorID,
		input.ResolutionNote,
		string(payload),
		input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events(event_type,entity_type,entity_id,payload,correlation_id)
		VALUES('order.preparation_issue_resolved','order',$1,$2::jsonb,$3)`,
		input.OrderID, string(payload), input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return resolved, nil
}

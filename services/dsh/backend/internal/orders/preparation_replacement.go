package orders

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type ProposeReplacementInput struct {
	OrderID                string
	StoreID                string
	OrderItemID            string
	ActorID                string
	AffectedQuantity       int
	Note                   string
	ReplacementProductID   string
	ReplacementProductName string
	ReplacementQuantity    int
	ReplacementUnitPrice   float64
	CorrelationID          string
}

func ProposeReplacement(db *sql.DB, rawInput ProposeReplacementInput) (*PreparationIssue, error) {
	input := rawInput
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.OrderItemID = strings.TrimSpace(input.OrderItemID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Note = strings.TrimSpace(input.Note)
	input.ReplacementProductID = strings.TrimSpace(input.ReplacementProductID)
	input.ReplacementProductName = strings.TrimSpace(input.ReplacementProductName)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)

	if db == nil || input.OrderID == "" || input.StoreID == "" || input.OrderItemID == "" || input.ActorID == "" ||
		input.AffectedQuantity < 1 || input.ReplacementProductID == "" || input.ReplacementProductName == "" ||
		input.ReplacementQuantity < 1 || input.ReplacementUnitPrice < 0 || input.CorrelationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

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
		return nil, fmt.Errorf("%w: replacement cannot be proposed from %s", ErrConflict, status)
	}

	var orderedQuantity int
	var originalUnitPrice float64
	if err := tx.QueryRow(`
		SELECT quantity, unit_price
		FROM dsh_order_items
		WHERE id=$1::uuid AND order_id=$2::uuid`, input.OrderItemID, input.OrderID).Scan(&orderedQuantity, &originalUnitPrice); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if input.AffectedQuantity > orderedQuantity {
		return nil, fmt.Errorf("%w: affected quantity exceeds ordered quantity", ErrInvalid)
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
			  AND order_item_id=$2::uuid
			  AND issue_kind='substitution_required'
			  AND status='open'
		)`, input.OrderID, input.OrderItemID).Scan(&duplicateOpen); err != nil {
		return nil, err
	}
	if duplicateOpen {
		return nil, fmt.Errorf("%w: matching substitution issue is already open", ErrConflict)
	}

	issue, err := scanPreparationIssue(tx.QueryRow(`
		INSERT INTO dsh_order_preparation_issues(
			order_id,store_id,order_item_id,issue_kind,affected_quantity,note,
			replacement_product_id,replacement_product_name,customer_decision,
			opened_by_actor_id,correlation_id)
		VALUES(
			$1::uuid,$2,$3::uuid,'substitution_required',$4,$5,$6,$7,'pending',$8,$9
		)
		RETURNING `+preparationIssueColumns,
		input.OrderID,
		input.StoreID,
		input.OrderItemID,
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

	if _, err := tx.Exec(`
		INSERT INTO dsh_order_preparation_replacements(
			issue_id, original_item_id, proposed_product_id, proposed_product_name, proposed_quantity, proposed_unit_price
		) VALUES (
			$1::uuid, $2::uuid, $3, $4, $5, $6
		)`,
		issue.ID,
		input.OrderItemID,
		input.ReplacementProductID,
		input.ReplacementProductName,
		input.ReplacementQuantity,
		input.ReplacementUnitPrice,
	); err != nil {
		return nil, err
	}

	payload, _ := json.Marshal(map[string]any{
		"issueId":              issue.ID,
		"orderId":              issue.OrderID,
		"storeId":              issue.StoreID,
		"kind":                 issue.Kind,
		"orderItemId":          issue.OrderItemID,
		"affectedQuantity":     issue.AffectedQuantity,
		"customerDecision":     issue.CustomerDecision,
		"replacementProduct":   issue.ReplacementProductName,
		"replacementUnitPrice": input.ReplacementUnitPrice,
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

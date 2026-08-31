package orders

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

// PartnerPreparationTransitionInput is the single DSH-owned contract for
// partner preparation transitions. The store scope is rechecked here even
// though HTTP authorization already resolved it, so direct callers cannot
// turn this domain function into an IDOR primitive.
type PartnerPreparationTransitionInput struct {
	OperatorContextID string
	OrderID           string
	StoreID           string
	ActorID           string
	Operation         string
	ExpectedVersion   int
	IdempotencyKey    string
}

func partnerPreparationFingerprint(input PartnerPreparationTransitionInput) string {
	hash := sha256.Sum256([]byte(strings.Join([]string{
		input.OperatorContextID,
		input.OrderID,
		input.StoreID,
		input.Operation,
		fmt.Sprintf("%d", input.ExpectedVersion),
	}, "|")))
	return hex.EncodeToString(hash[:])
}

// TransitionPartnerPreparation applies one legal transition, records its
// event and receipt in the same transaction, and returns the canonical order.
// A replay with the same key and request fingerprint has no second side
// effect; a reused key with another request is a conflict.
func TransitionPartnerPreparation(db *sql.DB, input PartnerPreparationTransitionInput) (*Order, error) {
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Operation = strings.TrimSpace(input.Operation)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if db == nil || input.OperatorContextID == "" || input.OrderID == "" || input.StoreID == "" || input.ActorID == "" ||
		(input.Operation != "prepare" && input.Operation != "ready") ||
		input.ExpectedVersion < 1 || len(input.IdempotencyKey) < 8 || len(input.IdempotencyKey) > 200 {
		return nil, ErrInvalid
	}

	fromStatus, toStatus := StatusStoreAccepted, StatusPreparing
	assignment, note := "preparation_started_at=COALESCE(preparation_started_at,NOW())", "preparation started"
	if input.Operation == "ready" {
		fromStatus, toStatus = StatusPreparing, StatusReadyForPickup
		assignment, note = "ready_at=COALESCE(ready_at,NOW())", "order ready for pickup"
	}
	fingerprint := partnerPreparationFingerprint(input)
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	// Serialize the idempotency identity before checking or creating its receipt.
	lockIdentity := input.StoreID + "|partner-order-preparation|" + input.IdempotencyKey
	if _, err := tx.Exec(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockIdentity); err != nil {
		return nil, err
	}

	var storedOrderID, storedOperation, storedFingerprint string
	err = tx.QueryRow(`
		SELECT order_id::text, operation, request_fingerprint
		FROM dsh_partner_order_transition_receipts
		WHERE store_id=$1 AND idempotency_key=$2`, input.StoreID, input.IdempotencyKey).
		Scan(&storedOrderID, &storedOperation, &storedFingerprint)
	if err == nil {
		if storedOrderID != input.OrderID || storedOperation != input.Operation || storedFingerprint != fingerprint {
			return nil, fmt.Errorf("%w: partner preparation idempotency key was reused with different input", ErrConflict)
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetOrderForContext(db, input.OperatorContextID, input.OrderID)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	var currentStatus OrderStatus
	var currentVersion int
	var actualStoreID string
	if err := tx.QueryRow(`
		SELECT status, version, store_id
		FROM dsh_orders
		WHERE id=$1::uuid AND operator_context_id=$2
		FOR UPDATE`, input.OrderID, input.OperatorContextID).Scan(&currentStatus, &currentVersion, &actualStoreID); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if actualStoreID != input.StoreID {
		return nil, ErrNotFound
	}
	if currentVersion != input.ExpectedVersion {
		return nil, fmt.Errorf("%w: expected version %d, got %d", ErrConflict, input.ExpectedVersion, currentVersion)
	}
	if currentStatus != fromStatus {
		return nil, fmt.Errorf("%w: cannot transition from %s to %s", ErrConflict, currentStatus, toStatus)
	}
	if input.Operation == "ready" {
		openIssueCount, err := countOpenPreparationIssuesTx(tx, input.OrderID)
		if err != nil {
			return nil, err
		}
		if openIssueCount > 0 {
			return nil, fmt.Errorf("%w: %d preparation issues must be resolved before readiness", ErrConflict, openIssueCount)
		}
	}

	query := fmt.Sprintf(`
		UPDATE dsh_orders
		SET status=$2, %s, updated_at=NOW()
		WHERE id=$1::uuid AND store_id=$4 AND status=$3 AND version=$5 AND operator_context_id=$6`, assignment)
	result, err := tx.Exec(query, input.OrderID, string(toStatus), string(fromStatus), input.StoreID, input.ExpectedVersion, input.OperatorContextID)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrConflict
	}

	if _, err := tx.Exec(`
		INSERT INTO dsh_order_status_events(order_id,actor_role,actor_id,from_status,to_status,note)
		VALUES($1::uuid,'partner',$2,$3,$4,$5)`, input.OrderID, input.ActorID, string(fromStatus), string(toStatus), note); err != nil {
		return nil, err
	}

	var resultVersion int
	if err := tx.QueryRow(`SELECT version FROM dsh_orders WHERE id=$1::uuid`, input.OrderID).Scan(&resultVersion); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_partner_order_transition_receipts
		(store_id,order_id,operation,idempotency_key,request_fingerprint,expected_version,result_version,actor_id)
		VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8)`, input.StoreID, input.OrderID, input.Operation,
		input.IdempotencyKey, fingerprint, input.ExpectedVersion, resultVersion, input.ActorID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetOrderForContext(db, input.OperatorContextID, input.OrderID)
}

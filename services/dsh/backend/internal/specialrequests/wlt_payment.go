package specialrequests

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/operationaloutbox"
	"github.com/lib/pq"
)

// ErrPaymentSessionMismatch indicates a WLT payment event referenced a
// paymentSessionId that does not match the session attached to the special
// request. Mirrors checkout.ErrPaymentSessionMismatch.
var ErrPaymentSessionMismatch = errors.New("wlt payment session id does not match special request")

// AttachWltPaymentSession stamps a WLT payment session id onto a special
// request once a quote has been set and approval is being requested. Unlike
// checkout.AttachWltPaymentSession, this does not move status: special
// requests have no payment_pending status in their 9-value enum, so status
// intentionally stays put here until WLT reports a terminal outcome via
// ApplyWltPaymentEvent.
func (s *Service) AttachWltPaymentSession(ctx context.Context, id string, expectedVersion int, sessionID string) (*SpecialRequest, error) {
	return s.AttachWltPaymentSessionInOperatorContext(ctx, "", id, expectedVersion, sessionID)
}

func (s *Service) AttachWltPaymentSessionInOperatorContext(ctx context.Context, operatorContextID string, id string, expectedVersion int, sessionID string) (*SpecialRequest, error) {
	var err error
	operatorContextID, err = requireOperatorContextID(operatorContextID)
	if err != nil {
		return nil, err
	}
	if id == "" || sessionID == "" {
		return nil, fmt.Errorf("%w: id and sessionID are required", ErrInvalid)
	}
	current, err := s.repo.GetInOperatorContext(ctx, operatorContextID, id)
	if err != nil {
		return nil, err
	}
	if current.Status != StatusNeedsCustomerInput || current.WorkflowStage == nil || *current.WorkflowStage != "customer_approval" {
		return nil, fmt.Errorf("%w: cannot attach payment session from status %s", ErrConflict, current.Status)
	}
	if current.WltQuoteID == nil || current.WltQuoteAmountMinorUnits == nil || current.WltQuoteCurrency == nil {
		return nil, fmt.Errorf("%w: WLT quote must be attached before approval", ErrInvalid)
	}
	if current.WltPaymentSessionID != nil {
		if *current.WltPaymentSessionID == sessionID {
			// The WLT handoff may have succeeded while the DSH response was
			// lost. Return the canonical projection for a safe replay.
			return current, nil
		}
		return nil, fmt.Errorf("%w: a different WLT payment session is already attached", ErrConflict)
	}

	tx, err := s.repo.DB().BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	updated, err := s.repo.UpdateInOperatorContextTx(ctx, tx, operatorContextID, id, expectedVersion, UpdateInput{WltPaymentSessionID: &sessionID})
	if err != nil {
		return nil, err
	}
	correlationID := ""
	if current.CorrelationID != nil {
		correlationID = strings.TrimSpace(*current.CorrelationID)
	}
	if err := WriteAuditEvent(tx, id, "wlt", "service", "wlt_payment_session_attached", sessionID, correlationID, requestJSON(current), requestJSON(updated)); err != nil {
		return nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType: "special_request_wlt_payment_session_attached", EntityType: "special_request", EntityID: id,
		Payload: requestJSON(updated), CorrelationID: correlationID,
	}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

var ErrWltEventReplayConflict = errors.New("special request WLT event replay conflict")
var ErrWltTerminalOutcomeConflict = errors.New("special request WLT terminal outcome conflict")

// WltPaymentEventReference is the single owner of the durable reference used
// for a WLT event receipt. The HTTP adapter must use this value verbatim so a
// derived event (one without an upstream eventId) cannot acquire a second,
// contradictory reference at the boundary.
func WltPaymentEventReference(operatorContextID, id, paymentSessionID, wltStatus, eventID string) (string, error) {
	eventKey, _, err := wltPaymentEventIdentity(operatorContextID, id, paymentSessionID, wltStatus, eventID)
	return eventKey, err
}

func wltPaymentEventIdentity(operatorContextID, id, paymentSessionID, wltStatus, eventID string) (string, string, error) {
	var err error
	operatorContextID, err = requireOperatorContextID(operatorContextID)
	if err != nil {
		return "", "", err
	}
	if id == "" || paymentSessionID == "" || wltStatus == "" {
		return "", "", fmt.Errorf("%w: id, paymentSessionId and status are required", ErrInvalid)
	}
	wltStatus = strings.TrimSpace(wltStatus)
	eventID = strings.TrimSpace(eventID)
	switch wltStatus {
	case "captured", "cod_finalized", "failed", "expired", "authorized", "reference_created", "cod_pending":
	default:
		return "", "", fmt.Errorf("%w: unsupported wltStatus %q", ErrInvalid, wltStatus)
	}
	if eventID != "" && (len(eventID) < 8 || len(eventID) > 200) {
		return "", "", fmt.Errorf("%w: eventId must contain between 8 and 200 characters", ErrInvalid)
	}
	canonical := strings.Join([]string{operatorContextID, id, paymentSessionID, wltStatus}, "\x1f")
	digest := sha256.Sum256([]byte(canonical))
	payloadHash := hex.EncodeToString(digest[:])
	if eventID != "" {
		return "wlt:" + eventID, payloadHash, nil
	}
	return "wlt-derived:" + payloadHash, payloadHash, nil
}

func isWltTerminalStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "captured", "cod_finalized", "failed", "expired":
		return true
	default:
		return false
	}
}

// wltPaymentEventAdvancesProjection prevents a delayed event from moving the
// DSH read model backwards. WLT remains the financial authority; this only
// protects the DSH projection from transport reordering. WLT's state machine
// makes terminal outcomes final, so a different terminal outcome is a
// boundary conflict that must fail closed rather than being silently ignored.
func wltPaymentEventAdvancesProjection(currentStatus, incomingStatus string) (bool, error) {
	ranks := map[string]int{
		"reference_created": 1,
		"authorized":        2,
		"cod_pending":       2,
		"captured":          3,
		"cod_finalized":     3,
		"failed":            3,
		"expired":           3,
	}
	if strings.TrimSpace(currentStatus) == "" {
		return true, nil
	}
	currentRank, currentOK := ranks[strings.TrimSpace(currentStatus)]
	incomingRank, incomingOK := ranks[strings.TrimSpace(incomingStatus)]
	if !currentOK || !incomingOK {
		return false, fmt.Errorf("%w: unsupported WLT projection status transition %q -> %q", ErrConflict, currentStatus, incomingStatus)
	}
	if isWltTerminalStatus(currentStatus) && isWltTerminalStatus(incomingStatus) && currentStatus != incomingStatus {
		return false, fmt.Errorf("%w: %w (%s -> %s)", ErrConflict, ErrWltTerminalOutcomeConflict, currentStatus, incomingStatus)
	}
	return incomingRank > currentRank, nil
}

// ApplyWltPaymentEvent is retained for internal callers that do not have the
// upstream event envelope. The HTTP webhook path uses the event-aware method
// below so WLT delivery replay is durable and atomic.
func ApplyWltPaymentEvent(db *sql.DB, operatorContextID string, id, paymentSessionID, wltStatus string) (*SpecialRequest, error) {
	request, _, err := ApplyWltPaymentEventWithEvent(db, operatorContextID, id, paymentSessionID, wltStatus, "", "")
	return request, err
}

// ApplyWltPaymentEventWithEvent records the WLT event receipt, updates the DSH
// projection, writes the audit/outbox closure, and marks the receipt applied in
// one transaction. A duplicate event is a read-only replay; reusing an event
// key with a different payload is rejected.
func ApplyWltPaymentEventWithEvent(db *sql.DB, operatorContextID string, id, paymentSessionID, wltStatus, eventID, correlationID string) (*SpecialRequest, bool, error) {
	var err error
	operatorContextID, err = requireOperatorContextID(operatorContextID)
	if err != nil {
		return nil, false, err
	}
	if id == "" || paymentSessionID == "" || wltStatus == "" {
		return nil, false, fmt.Errorf("%w: id, paymentSessionId and status are required", ErrInvalid)
	}
	wltStatus = strings.TrimSpace(wltStatus)
	eventID = strings.TrimSpace(eventID)
	correlationID = strings.TrimSpace(correlationID)
	eventKey, payloadHash, err := wltPaymentEventIdentity(operatorContextID, id, paymentSessionID, wltStatus, eventID)
	if err != nil {
		return nil, false, err
	}

	ctx := context.Background()
	repo := NewPostgresRepository(db)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer func() { _ = tx.Rollback() }()

	current, err := repo.GetInOperatorContextTx(ctx, tx, operatorContextID, id)
	if err != nil {
		return nil, false, err
	}
	if current.WltPaymentSessionID == nil || *current.WltPaymentSessionID != paymentSessionID {
		return nil, false, ErrPaymentSessionMismatch
	}
	if correlationID == "" && current.CorrelationID != nil {
		correlationID = strings.TrimSpace(*current.CorrelationID)
	}
	if isWltTerminalStatus(wltStatus) {
		var existingTerminalEventKey, existingTerminalStatus string
		err := tx.QueryRowContext(ctx, `
			SELECT event_key, wlt_status
			FROM dsh_special_request_wlt_event_receipts
			WHERE operator_context_id = $1
			  AND special_request_id = $2::uuid
			  AND payment_session_id = $3
			  AND wlt_status IN ('captured', 'cod_finalized', 'failed', 'expired')
			ORDER BY received_at
			LIMIT 1
			FOR UPDATE`, operatorContextID, id, paymentSessionID).Scan(&existingTerminalEventKey, &existingTerminalStatus)
		if err != nil && err != sql.ErrNoRows {
			return nil, false, err
		}
		if err == nil && existingTerminalEventKey != eventKey {
			return nil, false, fmt.Errorf("%w: existing terminal outcome %s cannot accept %s", ErrWltTerminalOutcomeConflict, existingTerminalStatus, wltStatus)
		}
	}

	var insertedKey string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_special_request_wlt_event_receipts
			(event_key, operator_context_id, special_request_id, payment_session_id,
			 wlt_status, payload_hash, correlation_id)
		VALUES ($1, $2, $3::uuid, $4, $5, $6, $7)
		ON CONFLICT (event_key) DO NOTHING
		RETURNING event_key`, eventKey, operatorContextID, id, paymentSessionID, wltStatus, payloadHash, correlationID).Scan(&insertedKey)
	if err != nil && err != sql.ErrNoRows {
		var pqErr *pq.Error
		if isWltTerminalStatus(wltStatus) && errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, false, fmt.Errorf("%w: terminal outcome is already recorded for this payment session", ErrWltTerminalOutcomeConflict)
		}
		return nil, false, err
	}
	if err == sql.ErrNoRows {
		var existingHash, existingContext, existingRequest, existingSession, existingStatus string
		if err := tx.QueryRowContext(ctx, `
			SELECT payload_hash, operator_context_id, special_request_id::text,
			       payment_session_id, wlt_status
			FROM dsh_special_request_wlt_event_receipts
			WHERE event_key = $1`, eventKey).Scan(&existingHash, &existingContext, &existingRequest, &existingSession, &existingStatus); err != nil {
			return nil, false, err
		}
		if existingHash != payloadHash || existingContext != operatorContextID || existingRequest != id || existingSession != paymentSessionID || existingStatus != wltStatus {
			return nil, false, ErrWltEventReplayConflict
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE dsh_special_request_wlt_event_receipts
			SET delivery_attempt_count = delivery_attempt_count + 1,
			    last_received_at = NOW(),
			    correlation_id = CASE WHEN $2 = '' THEN correlation_id ELSE $2 END
			WHERE event_key = $1`, eventKey, correlationID); err != nil {
			return nil, false, err
		}
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return current, true, nil
	}
	if err != nil {
		return nil, false, err
	}
	if insertedKey == "" {
		return nil, false, fmt.Errorf("%w: WLT event receipt was not registered", ErrConflict)
	}
	currentWltStatus := ""
	if current.LastWltStatus != nil {
		currentWltStatus = *current.LastWltStatus
	}
	advances, err := wltPaymentEventAdvancesProjection(currentWltStatus, wltStatus)
	if err != nil {
		return nil, false, err
	}
	if !advances {
		if err := WriteAuditEvent(tx, id, "wlt", "service", "wlt_payment_event_ignored_non_advancing", eventKey, correlationID, requestJSON(current), requestJSON(current)); err != nil {
			return nil, false, err
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE dsh_special_request_wlt_event_receipts
			SET applied_at = COALESCE(applied_at, NOW()), last_received_at = NOW()
			WHERE event_key = $1`, eventKey); err != nil {
			return nil, false, err
		}
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return current, false, nil
	}

	lastStatus := wltStatus
	lastEventAt := time.Now().UTC()
	update := UpdateInput{lastWltStatus: &lastStatus, lastWltEventAt: &lastEventAt}
	if (wltStatus == "captured" || wltStatus == "cod_finalized") && current.Status == StatusNeedsCustomerInput {
		if current.WorkflowStage == nil || *current.WorkflowStage != "customer_approval" {
			return nil, false, fmt.Errorf("%w: captured WLT event requires customer_approval stage", ErrConflict)
		}
		status := StatusApproved
		stage := defaultStageFor(current.RequestType, StatusApproved)
		update.Status = &status
		update.WorkflowStage = stage
		update.CustomerApprovedAt = &lastEventAt
	}
	updated, err := repo.UpdateInOperatorContextTx(ctx, tx, operatorContextID, id, current.Version, update)
	if err != nil {
		return nil, false, err
	}
	if err := WriteAuditEvent(tx, id, "wlt", "service", "wlt_payment_event", eventKey, correlationID, requestJSON(current), requestJSON(updated)); err != nil {
		return nil, false, err
	}
	if err := operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType:  "special_request_wlt_payment_" + wltStatus,
		EntityType: "special_request", EntityID: id, Payload: requestJSON(updated), CorrelationID: correlationID,
	}); err != nil {
		return nil, false, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_special_request_wlt_event_receipts
		SET applied_at = COALESCE(applied_at, NOW()), last_received_at = NOW()
		WHERE event_key = $1`, eventKey); err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return updated, false, nil
}

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
	defer tx.Rollback()
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
	switch wltStatus {
	case "captured", "cod_collected", "failed", "expired", "authorized", "reference_created", "cod_pending":
	default:
		return nil, false, fmt.Errorf("%w: unsupported wltStatus %q", ErrInvalid, wltStatus)
	}
	if eventID != "" && (len(eventID) < 8 || len(eventID) > 200) {
		return nil, false, fmt.Errorf("%w: eventId must contain between 8 and 200 characters", ErrInvalid)
	}
	canonical := strings.Join([]string{operatorContextID, id, paymentSessionID, wltStatus}, "\x1f")
	digest := sha256.Sum256([]byte(canonical))
	payloadHash := hex.EncodeToString(digest[:])
	eventKey := "wlt-derived:" + payloadHash
	if eventID != "" {
		eventKey = "wlt:" + eventID
	}

	ctx := context.Background()
	repo := NewPostgresRepository(db)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

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

	var insertedKey string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_special_request_wlt_event_receipts
			(event_key, operator_context_id, special_request_id, payment_session_id,
			 wlt_status, payload_hash, correlation_id)
		VALUES ($1, $2, $3::uuid, $4, $5, $6, $7)
		ON CONFLICT (event_key) DO NOTHING
		RETURNING event_key`, eventKey, operatorContextID, id, paymentSessionID, wltStatus, payloadHash, correlationID).Scan(&insertedKey)
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

	lastStatus := wltStatus
	lastEventAt := time.Now().UTC()
	update := UpdateInput{lastWltStatus: &lastStatus, lastWltEventAt: &lastEventAt}
	if (wltStatus == "captured" || wltStatus == "cod_collected") && current.Status == StatusNeedsCustomerInput {
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

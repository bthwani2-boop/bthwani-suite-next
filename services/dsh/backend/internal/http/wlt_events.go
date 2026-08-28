package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"dsh-api/internal/checkout"
	"dsh-api/internal/coupons"
	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"
)

// POST /dsh/internal/wlt/payment-session-events
// WLT is the payment and refund authority. Every event is OperatorContext-scoped before
// DSH changes checkout, order, coupon, loyalty, or promotion-funding state.
func (s *protectedStoreServer) handleWltPaymentSessionEvent(w http.ResponseWriter, r *http.Request) {
	if !requireWltServiceCaller(w, r) {
		return
	}
	var body struct {
		EventID           string `json:"eventId"`
		CorrelationID     string `json:"correlationId"`
		CheckoutIntentID  string `json:"checkoutIntentId"`
		SpecialRequestID  string `json:"specialRequestId"`
		OrderID           string `json:"orderId"`
		RefundReference   string `json:"refundReference"`
		Reason            string `json:"reason"`
		OperatorContextID string `json:"operatorContextId"`
		PaymentSessionID  string `json:"paymentSessionId"`
		PaymentMethod     string `json:"paymentMethod"`
		Status            string `json:"status"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	body.EventID = strings.TrimSpace(body.EventID)
	body.CorrelationID = strings.TrimSpace(body.CorrelationID)
	body.OperatorContextID = strings.TrimSpace(body.OperatorContextID)
	body.CheckoutIntentID = strings.TrimSpace(body.CheckoutIntentID)
	body.SpecialRequestID = strings.TrimSpace(body.SpecialRequestID)
	body.PaymentSessionID = strings.TrimSpace(body.PaymentSessionID)
	body.PaymentMethod = strings.TrimSpace(body.PaymentMethod)
	body.Status = strings.TrimSpace(body.Status)
	body.OrderID = strings.TrimSpace(body.OrderID)
	if body.OperatorContextID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required")
		return
	}
	if body.Status == "refunded" {
		handleConfirmedRefundEffect(
			w,
			s,
			body.OperatorContextID,
			strings.TrimSpace(body.OrderID),
			strings.TrimSpace(body.RefundReference),
			strings.TrimSpace(body.Reason),
		)
		return
	}
	if body.PaymentSessionID == "" || body.Status == "" ||
		(body.CheckoutIntentID == "" && body.SpecialRequestID == "") ||
		(body.CheckoutIntentID != "" && body.SpecialRequestID != "") {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId, exactly one payment source, paymentSessionId and status are required")
		return
	}

	if body.SpecialRequestID != "" {
		req, replayed, err := specialrequests.ApplyWltPaymentEventWithEvent(s.db, body.OperatorContextID, body.SpecialRequestID, body.PaymentSessionID, body.Status, body.EventID, body.CorrelationID)
		if errors.Is(err, specialrequests.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
			return
		}
		if errors.Is(err, specialrequests.ErrPaymentSessionMismatch) {
			store.SendError(w, http.StatusConflict, "PAYMENT_SESSION_MISMATCH", "paymentSessionId does not match special request")
			return
		}
		if errors.Is(err, specialrequests.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if errors.Is(err, specialrequests.ErrConflict) || errors.Is(err, specialrequests.ErrVersionConflict) {
			store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
			return
		}
		if errors.Is(err, specialrequests.ErrWltEventReplayConflict) {
			store.SendError(w, http.StatusConflict, "WLT_EVENT_REPLAY_CONFLICT", "eventId was already used for a different special-request WLT event")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to apply WLT payment event")
			return
		}
		eventReference, err := specialrequests.WltPaymentEventReference(body.OperatorContextID, body.SpecialRequestID, body.PaymentSessionID, body.Status, body.EventID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to derive WLT event reference")
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{
			"specialRequest": marshalSpecialRequest(req),
			"eventReference": eventReference,
			"replayed":       replayed,
		})
		return
	}

	// Checkout projection, coupon projection and durable event receipt are one
	// PostgreSQL transaction. No response can expose a partially applied event.
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to begin WLT event transaction")
		return
	}
	defer tx.Rollback()

	intent, err := checkout.ApplyWltPaymentEventTx(
		r.Context(),
		tx,
		body.OperatorContextID,
		body.CheckoutIntentID,
		body.PaymentSessionID,
		body.Status,
	)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found in OperatorContext")
		return
	}
	if errors.Is(err, checkout.ErrPaymentSessionMismatch) {
		store.SendError(w, http.StatusConflict, "PAYMENT_SESSION_MISMATCH", "paymentSessionId does not match checkout intent")
		return
	}
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to apply WLT payment event")
		return
	}

	eventEnvelope := checkout.WltPaymentEventEnvelope{
		EventID:           body.EventID,
		OperatorContextID: body.OperatorContextID,
		CheckoutIntentID:  body.CheckoutIntentID,
		PaymentSessionID:  body.PaymentSessionID,
		Status:            body.Status,
		CorrelationID:     body.CorrelationID,
	}
	eventKey, replayed, err := checkout.BeginWltPaymentEventTx(r.Context(), tx, eventEnvelope)
	if errors.Is(err, checkout.ErrWltEventReplayConflict) {
		store.SendError(w, http.StatusConflict, "WLT_EVENT_REPLAY_CONFLICT", "eventId was already used for a different WLT payment event")
		return
	}
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register WLT payment event")
		return
	}
	if err := coupons.ApplyPaymentOutcomeTx(r.Context(), tx, body.CheckoutIntentID, body.Status); err != nil {
		store.SendError(w, http.StatusInternalServerError, "COUPON_RECONCILIATION_FAILED", "WLT event was not applied because coupon reconciliation failed")
		return
	}
	if body.OrderID != "" {
		// The order payment projection is applied inside the same transaction as
		// the event receipt: if it fails, the whole event is rejected so WLT
		// redelivers it, instead of committing an accepted event whose order
		// projection silently diverges with no replay source.
		if err := applyOrderPaymentProjection(r.Context(), tx, body.OrderID, body.OperatorContextID, body.PaymentSessionID, body.PaymentMethod, body.Status, body.CorrelationID); err != nil {
			log.Printf("[wlt-events] order payment projection rejected event orderID=%s sessionID=%s correlationID=%s: %v", body.OrderID, body.PaymentSessionID, body.CorrelationID, err)
			store.SendError(w, http.StatusInternalServerError, "ORDER_PROJECTION_FAILED", "WLT event was not applied because the order payment projection failed")
			return
		}
	}
	if err := checkout.MarkWltPaymentEventAppliedTx(r.Context(), tx, eventKey, eventEnvelope); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to finalize WLT payment event receipt")
		return
	}
	if err := tx.Commit(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to commit WLT payment event")
		return
	}

	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load checkout pricing")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"intent":         marshalIntentWithPricing(intent, pricing),
		"eventReference": eventKey,
		"replayed":       replayed,
	})
}

func handleConfirmedRefundEffect(w http.ResponseWriter, s *protectedStoreServer, operatorContextID, orderID, refundReference, reason string) {
	if operatorContextID == "" || orderID == "" || refundReference == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId, orderId and refundReference are required for refunded status")
		return
	}
	var exists bool
	if err := s.db.QueryRow(`SELECT EXISTS(
                SELECT 1 FROM dsh_orders WHERE id=$1::uuid AND operator_context_id=$2
        )`, orderID, operatorContextID).Scan(&exists); err != nil {
		store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to verify refund order OperatorContext")
		return
	}
	if !exists {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found in OperatorContext")
		return
	}

	var couponReversed, loyaltyQueued, fundingQueued bool
	err := s.db.QueryRow(`
                SELECT coupon_reversed,loyalty_reversal_queued,funding_reversal_queued
                FROM dsh_apply_confirmed_refund_effects($1::uuid,$2,$3)`,
		orderID, refundReference, reason,
	).Scan(&couponReversed, &loyaltyQueued, &fundingQueued)
	if errors.Is(err, sql.ErrNoRows) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund effect target not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusConflict, "REFUND_EFFECT_CONFLICT", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"orderId":               orderID,
		"refundReference":       refundReference,
		"couponReversed":        couponReversed,
		"loyaltyReversalQueued": loyaltyQueued,
		"fundingReversalQueued": fundingQueued,
	})
}

func requireWltServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return store.RequireServiceCaller(w, r, "DSH_WLT_SERVICE_TOKEN", "wlt")
}

func applyOrderPaymentProjection(ctx context.Context, tx *sql.Tx, orderID, operatorContextID, sessionID, method, status, correlationID string) error {
	projection, err := mapWltPaymentProjection(method, status)
	if err != nil {
		return err
	}

	var currentProjection, currentOrderStatus, dbCorrelationID string
	var currentVersion int
	var currentSourceUpdated sql.NullTime
	err = tx.QueryRowContext(ctx, `
                SELECT payment_status_projection,status,correlation_id,version,payment_projection_source_updated_at
                FROM dsh_orders
                WHERE id=$1::uuid AND operator_context_id=$2 AND wlt_payment_ref_id=$3
                FOR UPDATE`, orderID, operatorContextID, sessionID,
	).Scan(&currentProjection, &currentOrderStatus, &dbCorrelationID, &currentVersion, &currentSourceUpdated)
	if errors.Is(err, sql.ErrNoRows) {
		return nil // Not found, maybe it's not created yet or wrong order ID
	}
	if err != nil {
		return err
	}

	projectionChanged := currentProjection != projection
	newVersion := currentVersion
	if projectionChanged {
		err = tx.QueryRowContext(ctx, `
                        UPDATE dsh_orders
                        SET payment_status_projection=$1,
                            payment_projection_updated_at=NOW(),
                            payment_projection_reconciled_at=NOW(),
                            version=version+1,
                            updated_at=NOW()
                        WHERE id=$3::uuid AND operator_context_id=$4 AND wlt_payment_ref_id=$5
                        RETURNING version`, projection, orderID, operatorContextID, sessionID,
		).Scan(&newVersion)
		if err != nil {
			return err
		}
		metadata := fmt.Sprintf(`{"source":"WLT","paymentProjection":%q,"wltStatus":%q}`, projection, status)
		_, err = tx.ExecContext(ctx, `
                        INSERT INTO dsh_order_status_events
                        (order_id,operator_context_id,actor_role,actor_id,from_status,to_status,note,event_type,
                         correlation_id,causation_id,order_version,metadata)
                        VALUES ($1::uuid,$2,'system','wlt',$3,$3,'verified WLT projection changed',
                                'order.payment_projection_updated',$4,$5,$6,$7::jsonb)`,
			orderID,
			operatorContextID,
			currentOrderStatus,
			correlationID,
			sessionID,
			newVersion,
			metadata,
		)
		if err != nil {
			return err
		}
	} else {
		_, err = tx.ExecContext(ctx, `
                        UPDATE dsh_orders
                        SET payment_projection_reconciled_at=NOW()
                        WHERE id=$1::uuid AND operator_context_id=$2 AND wlt_payment_ref_id=$3`,
			orderID, operatorContextID, sessionID,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func mapWltPaymentProjection(method, status string) (string, error) {
	method = strings.TrimSpace(strings.ToLower(method))
	status = strings.TrimSpace(strings.ToLower(status))
	switch status {
	case "initiated", "reference_created":
		if method == "cod" {
			return "cash_due", nil
		}
		return "pending", nil
	case "captured":
		return "confirmed", nil
	case "refunded":
		return "refunded", nil
	case "failed":
		return "failed", nil
	case "cancelled":
		return "cancelled", nil
	case "expired":
		return "expired", nil
	default:
		return "", fmt.Errorf("unsupported WLT payment status %q", status)
	}
}

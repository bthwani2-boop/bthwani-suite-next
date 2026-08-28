package http

import (
	"encoding/json"
	"net/http"
	"strings"

	"dsh-api/internal/checkoutfinanceoutbox"
	"dsh-api/internal/store"
	"dsh-api/internal/wltoutbox"
)

type checkoutClosureRecoveryCommand struct {
	Reason string `json:"reason"`
}

func (s *protectedStoreServer) checkoutClosureRecovery(w http.ResponseWriter, r *http.Request, reconcile bool) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	outboxID := strings.TrimSpace(r.PathValue("outboxId"))
	if outboxID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "outboxId is required")
		return
	}
	var input checkoutClosureRecoveryCommand
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	input.Reason = strings.TrimSpace(input.Reason)
	if input.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
		return
	}

	var err error
	if reconcile {
		err = checkoutfinanceoutbox.RequeueForReconciliationForOperatorContext(s.db, outboxID, operatorContextID, input.Reason)
	} else {
		err = checkoutfinanceoutbox.RetryFailedForOperatorContext(s.db, outboxID, operatorContextID, input.Reason)
	}
	if err != nil {
		store.SendError(w, http.StatusConflict, "CHECKOUT_CLOSURE_RECOVERY_CONFLICT", "checkout financial closure is not eligible for this recovery action")
		return
	}
	status := "retry_scheduled"
	if reconcile {
		status = "reconciliation_scheduled"
	}
	store.SendJSON(w, http.StatusOK, map[string]string{
		"outboxId": outboxID,
		"status":   status,
	})
}

func (s *protectedStoreServer) handleRetryCheckoutFinancialClosure(w http.ResponseWriter, r *http.Request) {
	s.checkoutClosureRecovery(w, r, false)
}

func (s *protectedStoreServer) handleReconcileCheckoutFinancialClosure(w http.ResponseWriter, r *http.Request) {
	s.checkoutClosureRecovery(w, r, true)
}

// handleRetryWltOutboxEvent re-drives a DSH→WLT financial event (loyalty,
// commission, promotion funding) that exhausted its delivery or readback
// attempts. The underlying WLT mutations are idempotent by deterministic
// command identity, so re-dispatch cannot double-apply.
func (s *protectedStoreServer) handleRetryWltOutboxEvent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	eventID := strings.TrimSpace(r.PathValue("eventId"))
	if eventID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "eventId is required")
		return
	}
	var input checkoutClosureRecoveryCommand
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	input.Reason = strings.TrimSpace(input.Reason)
	if input.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
		return
	}
	if err := wltoutbox.RetryFailedForOperatorContext(r.Context(), s.db, eventID, operatorContextID, input.Reason); err != nil {
		store.SendError(w, http.StatusConflict, "WLT_OUTBOX_RECOVERY_CONFLICT", "WLT outbox event is not eligible for recovery")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]string{
		"eventId": eventID,
		"status":  "retry_scheduled",
	})
}

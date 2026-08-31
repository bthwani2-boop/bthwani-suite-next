package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/checkoutfinanceoutbox"
	"dsh-api/internal/dispatch"
	"dsh-api/internal/orders"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) handleCreateGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireOperatorCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	if err := store.EnforceKillSwitch(r.Context(), s.decisionService, "dispatch_assignment", actor.ID); err != nil {
		store.SendError(w, http.StatusForbidden, "KILL_SWITCH_ACTIVE", err.Error())
		return
	}
	var body struct {
		OrderID                string `json:"orderId"`
		CaptainID              string `json:"captainId"`
		ServiceAreaCode        string `json:"serviceAreaCode"`
		IdempotencyKey         string `json:"idempotencyKey"`
		Priority               int    `json:"priority"`
		DistanceMeters         *int   `json:"distanceMeters"`
		OfferReason            string `json:"offerReason"`
		ResponseTimeoutSeconds int    `json:"responseTimeoutSeconds"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	financialEligibility, err := s.refreshCaptainFinancialEligibility(r, operatorContextID, body.CaptainID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	if !financialEligibility.Eligible {
		store.SendError(w, http.StatusConflict, financialEligibility.IneligibilityReason, "captain does not meet the WLT-backed dispatch balance requirement")
		return
	}
	if bodyKey := strings.TrimSpace(body.IdempotencyKey); bodyKey != "" && bodyKey != idempotencyKey {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_MISMATCH", "request body idempotencyKey must match Idempotency-Key")
		return
	}
	assignment, replayed, err := dispatch.CreateGovernedAssignment(s.db, dispatch.GovernedCreateAssignmentInput{
		OrderID: body.OrderID, OperatorContextID: operatorContextID, CaptainID: body.CaptainID,
		ActorID: actor.ID, ServiceAreaCode: body.ServiceAreaCode, IdempotencyKey: idempotencyKey,
		Priority: body.Priority, DistanceMeters: body.DistanceMeters, OfferReason: body.OfferReason,
		ResponseTimeoutSecond: body.ResponseTimeoutSeconds,
	})
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	store.SendJSON(w, status, map[string]any{"assignment": payload, "replayed": replayed})
}

func (s *protectedStoreServer) handleListGovernedOperatorDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	_, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	// operatorContextId must come from the authenticated Identity session, not from
	// client-supplied query parameters. A browser-controlled ID is a resource locator
	// claim and confers no authorization (J009).
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	list, err := dispatch.ListOperatorAssignmentsInOperatorContext(s.db, operatorContextID, 200)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignments(list)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": payload})
}

func (s *protectedStoreServer) handleListGovernedCaptainDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	// OperatorContext must come from the trusted Identity session, not the browser (J009).
	operatorContextID := strings.TrimSpace(actor.OperatorContextID)
	if operatorContextID == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}

	readiness, err := s.getCaptainAggregatedReadiness(r, operatorContextID, actor.ID)
	if err != nil {
		writeCaptainReadinessError(w, err)
		return
	}
	if !readiness.Ready {
		store.SendJSON(w, http.StatusForbidden, map[string]any{
			"error":   "CAPTAIN_NOT_READY",
			"message": "you must complete your readiness requirements before listing assignments",
			"missing": readiness.Missing,
		})
		return
	}

	list, err := dispatch.ListCaptainAssignmentsInOperatorContext(s.db, operatorContextID, actor.ID, 100)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignments(list)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": payload})
}

func (s *protectedStoreServer) handleAcceptGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "captain OperatorContext context is required")
		return
	}
	idempotencyKey, correlationID, ok := requireCaptainCommandIdentity(w, r)
	if !ok {
		return
	}

	readiness, err := s.getCaptainAggregatedReadiness(r, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeCaptainReadinessError(w, err)
		return
	}
	if !readiness.Ready {
		store.SendJSON(w, http.StatusForbidden, map[string]any{
			"error":   "CAPTAIN_NOT_READY",
			"message": "you must complete your readiness requirements before accepting assignments",
			"missing": readiness.Missing,
		})
		return
	}

	assignment, err := dispatch.GetCaptainAssignmentForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("assignmentId"), actor.ID)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}

	var isCod bool
	var sessionID string
	var checkoutIntentID string
	var orderAmount int64
	var orderCurrency string

	tx, err := s.db.BeginTx(r.Context(), nil)
	if err == nil {
		deliveryCtx, err := orders.GetOrderDeliveryContextForOperatorContext(tx, actor.OperatorContextID, assignment.OrderID)
		if err == nil && (deliveryCtx.PaymentMethod == "cod" || deliveryCtx.PaymentMethod == "mixed") && deliveryCtx.WltPaymentSessionID != "" {
			isCod = true
			sessionID = deliveryCtx.WltPaymentSessionID
			checkoutIntentID = deliveryCtx.CheckoutIntentID
		}
		_ = tx.Rollback()
	}

	if isCod {
		session, err := s.wlt.GetPaymentSession(wlt.WithOperatorContext(r.Context(), actor.OperatorContextID), sessionID)
		if err != nil {
			store.SendError(w, http.StatusServiceUnavailable, "WLT_UNAVAILABLE", "failed to verify COD capacity")
			return
		}
		if session.TenderAllocation == nil {
			store.SendError(w, http.StatusServiceUnavailable, "WLT_TENDER_ALLOCATION_UNAVAILABLE", "WLT has not published the immutable cash-on-delivery tender")
			return
		}
		orderAmount = session.TenderAllocation.CashOnDeliveryAmountMinorUnits
		orderCurrency = session.Currency
		if orderAmount > 0 {
			_, _, err = s.wlt.ReserveCodCapacity(r.Context(), assignment.OrderID, checkoutIntentID, actor.ID, orderAmount, orderCurrency, correlationID, idempotencyKey)
			if err != nil {
				if strings.Contains(err.Error(), "INSUFFICIENT") {
					store.SendError(w, http.StatusConflict, "INSUFFICIENT_COD_CAPACITY", "insufficient COD capacity to accept this order")
				} else {
					store.SendError(w, http.StatusConflict, "COD_RESERVATION_FAILED", err.Error())
				}
				return
			}
		}
	}

	originalAssignment := assignment
	acceptedAssignment, err := dispatch.AcceptGovernedAssignmentForOperatorContext(
		s.db, actor.OperatorContextID, r.PathValue("assignmentId"), actor.ID, idempotencyKey, correlationID,
	)
	if err != nil {
		if isCod && originalAssignment != nil && originalAssignment.OrderID != "" {
			currentAssignment, readErr := dispatch.GetCaptainAssignmentForOperatorContext(s.db, actor.OperatorContextID, originalAssignment.ID, actor.ID)
			if readErr != nil && !errors.Is(readErr, dispatch.ErrNotFound) {
				store.SendError(w, http.StatusServiceUnavailable, "COD_RESERVATION_RELEASE_UNCERTAIN", "assignment state could not be reconciled after acceptance failure")
				return
			}
			if readErr != nil || currentAssignment.Status != dispatch.AssignmentAccepted {
				if enqueueErr := checkoutfinanceoutbox.EnqueueCodReservationReleaseForOrder(s.db, originalAssignment.OrderID, "assignment_accept_failed", correlationID); enqueueErr != nil {
					store.SendError(w, http.StatusServiceUnavailable, "COD_RESERVATION_RELEASE_UNCERTAIN", "COD reservation release could not be durably queued")
					return
				}
			}
		}
		writeGovernedDispatchError(w, err)
		return
	}
	assignment = acceptedAssignment
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": payload})
}

func (s *protectedStoreServer) handleDeclineGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireCaptainCommandIdentity(w, r)
	if !ok {
		return
	}
	var body struct {
		ReasonCode string `json:"reasonCode"`
		Reason     string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignmentID := r.PathValue("assignmentId")
	assignment, err := dispatch.DeclineGovernedAssignmentForOperatorContext(
		s.db, actor.OperatorContextID, assignmentID, actor.ID, body.ReasonCode, body.Reason, idempotencyKey, correlationID,
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": payload})
}

func (s *protectedStoreServer) handleUpsertCaptainDispatchProfile(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	var body struct {
		AccreditationStatus  string `json:"accreditationStatus"`
		AvailabilityStatus   string `json:"availabilityStatus"`
		MaxActiveAssignments int    `json:"maxActiveAssignments"`
		PriorityScore        int    `json:"priorityScore"`
		ExpectedVersion      int    `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	candidate, err := dispatch.UpsertCaptainDispatchProfile(s.db, dispatch.CaptainDispatchProfileInput{
		OperatorContextID: operatorContextID, CaptainID: r.PathValue("captainId"),
		AccreditationStatus: body.AccreditationStatus, AvailabilityStatus: body.AvailabilityStatus,
		MaxActiveAssignments: body.MaxActiveAssignments, PriorityScore: body.PriorityScore,
		ExpectedVersion: body.ExpectedVersion, ActorID: actor.ID,
	})
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	financial, financialErr := dispatch.GetCaptainFinancialEligibilitySnapshot(r.Context(), s.db, operatorContextID, r.PathValue("captainId"))
	if financialErr != nil || !financial.Eligible || !financial.ExpiresAt.After(time.Now()) {
		candidate.Eligible = false
		candidate.IneligibilityReason = "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED"
		if financialErr == nil && financial.IneligibilityReason != "" {
			candidate.IneligibilityReason = financial.IneligibilityReason
		}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"candidate": candidate})
}

func (s *protectedStoreServer) handleListCaptainDispatchCandidates(w http.ResponseWriter, r *http.Request) {
	_, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	// OperatorContext must come from the trusted Identity session (J009).
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	limit := parseDispatchLimit(r.URL.Query().Get("limit"), 100)
	items, err := dispatch.ListCaptainDispatchCandidates(
		s.db, operatorContextID, r.URL.Query().Get("serviceAreaCode"), limit,
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	now := time.Now()
	for index := range items {
		financial, financialErr := dispatch.GetCaptainFinancialEligibilitySnapshot(r.Context(), s.db, operatorContextID, items[index].CaptainID)
		if financialErr != nil || !financial.Eligible || !financial.ExpiresAt.After(now) {
			items[index].Eligible = false
			items[index].IneligibilityReason = "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED"
			if financialErr == nil && financial.IneligibilityReason != "" {
				items[index].IneligibilityReason = financial.IneligibilityReason
			}
		}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"candidates": items})
}

func (s *protectedStoreServer) handleReassignGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireOperatorCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	var body struct {
		CaptainID              string `json:"captainId"`
		ServiceAreaCode        string `json:"serviceAreaCode"`
		IdempotencyKey         string `json:"idempotencyKey"`
		Priority               int    `json:"priority"`
		DistanceMeters         *int   `json:"distanceMeters"`
		Reason                 string `json:"reason"`
		ResponseTimeoutSeconds int    `json:"responseTimeoutSeconds"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	financialEligibility, err := s.refreshCaptainFinancialEligibility(r, operatorContextID, body.CaptainID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	if !financialEligibility.Eligible {
		store.SendError(w, http.StatusConflict, financialEligibility.IneligibilityReason, "captain does not meet the WLT-backed dispatch balance requirement")
		return
	}
	if bodyKey := strings.TrimSpace(body.IdempotencyKey); bodyKey != "" && bodyKey != idempotencyKey {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_MISMATCH", "request body idempotencyKey must match Idempotency-Key")
		return
	}
	assignmentID := r.PathValue("assignmentId")
	assignment, err := dispatch.ReassignGovernedAssignment(s.db, dispatch.ReassignAssignmentInput{
		AssignmentID: assignmentID, OperatorContextID: operatorContextID,
		CaptainID: body.CaptainID, ActorID: actor.ID, ServiceAreaCode: body.ServiceAreaCode,
		IdempotencyKey: idempotencyKey, Priority: body.Priority, DistanceMeters: body.DistanceMeters,
		Reason: body.Reason, ResponseTimeoutSecond: body.ResponseTimeoutSeconds,
	})
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"assignment": payload})
}

func (s *protectedStoreServer) handleCancelGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireOperatorCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	var body struct {
		ReasonCode string `json:"reasonCode"`
		Reason     string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	assignmentID := r.PathValue("assignmentId")
	if err := dispatch.CancelGovernedAssignmentIdempotentForOperatorContext(
		s.db, operatorContextID, assignmentID, actor.ID, body.ReasonCode, body.Reason, idempotencyKey, correlationID,
	); err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handleExpireGovernedDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireOperatorCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	var body struct {
		Limit int `json:"limit"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	if body.Limit == 0 {
		body.Limit = 100
	}
	count, err := dispatch.ExpireOverdueAssignmentsIdempotentForOperatorContext(
		s.db, operatorContextID, actor.ID, body.Limit, idempotencyKey, correlationID,
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"expiredCount": count})
}

func (s *protectedStoreServer) handleListDispatchDecisions(w http.ResponseWriter, r *http.Request) {
	_, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	// OperatorContext must come from the trusted Identity session (J009).
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	items, err := dispatch.ListDispatchDecisions(
		s.db, operatorContextID, r.URL.Query().Get("assignmentId"),
		r.URL.Query().Get("orderId"), parseDispatchLimit(r.URL.Query().Get("limit"), 100),
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"decisions": items})
}

func (s *protectedStoreServer) marshalGovernedDispatchAssignment(item *dispatch.Assignment) (map[string]any, error) {
	payload := marshalDispatchAssignment(*item)
	governance, err := dispatch.GetAssignmentGovernance(s.db, item.ID)
	if err != nil {
		return nil, err
	}
	payload["operatorContextId"] = governance.OperatorContextID
	payload["serviceAreaCode"] = governance.ServiceAreaCode
	payload["priority"] = governance.Priority
	payload["distanceMeters"] = governance.DistanceMeters
	payload["offerReason"] = governance.OfferReason
	payload["responseReason"] = governance.ResponseReason
	payload["expiredAt"] = governance.ExpiredAt
	payload["cancelledAt"] = governance.CancelledAt
	payload["cancelledBy"] = governance.CancelledBy
	payload["supersedesAssignmentId"] = governance.SupersedesAssignmentID
	payload["version"] = governance.Version
	payload["allowedActions"] = dispatch.AssignmentAllowedActions(item.Status, item.Delivery.Status)

	var rawAddress []byte
	err = s.db.QueryRow(`SELECT delivery_address_snapshot FROM dsh_orders WHERE id = $1::uuid`, item.OrderID).Scan(&rawAddress)
	if err == nil && len(rawAddress) > 0 {
		var addr map[string]any
		if err := json.Unmarshal(rawAddress, &addr); err == nil {
			if item.Delivery.Status == dispatch.DeliveryAssigned || item.Delivery.Status == dispatch.DeliveryDriverAssigned || item.Delivery.Status == dispatch.DeliveryArrivedStore {
				delete(addr, "address1")
				delete(addr, "address2")
				delete(addr, "contactPhone")
				delete(addr, "instructions")
			}
			payload["deliveryAddress"] = addr
		}
	}

	return payload, nil
}

func (s *protectedStoreServer) marshalGovernedDispatchAssignments(items []dispatch.Assignment) ([]map[string]any, error) {
	ids := make([]string, len(items))
	for i := range items {
		ids[i] = items[i].ID
	}
	governance, err := dispatch.ListAssignmentGovernance(s.db, ids)
	if err != nil {
		return nil, err
	}
	payload := make([]map[string]any, len(items))
	for i := range items {
		row := marshalDispatchAssignment(items[i])
		meta, ok := governance[items[i].ID]
		if !ok {
			return nil, errors.New("dispatch assignment governance readback missing")
		}
		row["operatorContextId"] = meta.OperatorContextID
		row["serviceAreaCode"] = meta.ServiceAreaCode
		row["priority"] = meta.Priority
		row["distanceMeters"] = meta.DistanceMeters
		row["offerReason"] = meta.OfferReason
		row["responseReason"] = meta.ResponseReason
		row["expiredAt"] = meta.ExpiredAt
		row["cancelledAt"] = meta.CancelledAt
		row["cancelledBy"] = meta.CancelledBy
		row["supersedesAssignmentId"] = meta.SupersedesAssignmentID
		row["version"] = meta.Version
		row["allowedActions"] = dispatch.AssignmentAllowedActions(items[i].Status, items[i].Delivery.Status)

		var rawAddress []byte
		err := s.db.QueryRow(`SELECT delivery_address_snapshot FROM dsh_orders WHERE id = $1::uuid`, items[i].OrderID).Scan(&rawAddress)
		if err == nil && len(rawAddress) > 0 {
			var addr map[string]any
			if err := json.Unmarshal(rawAddress, &addr); err == nil {
				if items[i].Delivery.Status == dispatch.DeliveryAssigned || items[i].Delivery.Status == dispatch.DeliveryDriverAssigned || items[i].Delivery.Status == dispatch.DeliveryArrivedStore {
					delete(addr, "address1")
					delete(addr, "address2")
					delete(addr, "contactPhone")
					delete(addr, "instructions")
				}
				row["deliveryAddress"] = addr
			}
		}

		payload[i] = row
	}
	return payload, nil
}

func parseDispatchLimit(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return fallback
	}
	if value > 500 {
		return 500
	}
	return value
}

func writeGovernedDispatchError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, dispatch.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different Captain dispatch command")
	case errors.Is(err, dispatch.ErrAvailabilityProjectionStale):
		store.SendError(w, http.StatusConflict, "STALE_SOURCE_VERSION", err.Error())
	case errors.Is(err, dispatch.ErrAvailabilityProjectionIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "DISPATCH_NOT_FOUND", err.Error())
	case errors.Is(err, dispatch.ErrCaptainNotEligible) || strings.Contains(err.Error(), "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED"):
		store.SendError(w, http.StatusConflict, "CAPTAIN_NOT_ELIGIBLE", err.Error())
	case errors.Is(err, dispatch.ErrCaptainAtCapacity):
		store.SendError(w, http.StatusConflict, "CAPTAIN_AT_CAPACITY", err.Error())
	case errors.Is(err, dispatch.ErrOfferExpired):
		store.SendError(w, http.StatusConflict, "DISPATCH_OFFER_EXPIRED", err.Error())
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "DISPATCH_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "dispatch operation failed")
	}
}

package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

// Permission constants for the special-requests (SHEIN/Awnak) operator
// domain. Operator endpoints here previously reused SupportPermissionRead/
// SupportPermissionManage -- special requests are an Operations decision
// (dispatch, transition, monitoring), not a Support-ticket decision, so
// gating them on the Support permission set let a support-only actor hold
// authority over an Operations capability it does not own. These constants
// (mirroring OperationsPermissionRead/Manage in orders.go) correct that.
const (
	OperationsSpecialRequestsPermissionRead       = "operations.special_requests.read"
	OperationsSpecialRequestsPermissionTransition = "operations.special_requests.transition" // operator PATCH: review/quote/stage transitions
	OperationsSpecialRequestsPermissionDispatch   = "operations.special_requests.dispatch"   // assign a special request to a captain
)

func parseLimitOffset(r *http.Request) (int, int) {
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}
	return limit, offset
}

func specialRequestCorrelationID(r *http.Request) *string {
	id := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if id == "" {
		id = uuid.NewString()
	}
	return &id
}

// decodeOptionalProtectedJSON is decodeProtectedJSON's lenient counterpart:
// an empty body is accepted and leaves target untouched, since some actions
// (client cancel) allow callers to omit the body entirely.
func decodeOptionalProtectedJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64*1024))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	if len(bytes.TrimSpace(body)) == 0 {
		return true
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

func writeSpecialRequestError(w http.ResponseWriter, err error, notFoundMsg string) {
	switch {
	case errors.Is(err, specialrequests.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", notFoundMsg)
	case errors.Is(err, specialrequests.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "special request version changed; reload before retrying")
	case errors.Is(err, specialrequests.ErrConflict):
		store.SendError(w, http.StatusConflict, "INVALID_TRANSITION", err.Error())
	case errors.Is(err, specialrequests.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case errors.Is(err, specialrequests.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "special request access forbidden")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "special request action failed")
	}
}

func marshalSpecialRequestSaga(saga *specialrequests.SpecialRequestSaga) map[string]any {
	if saga == nil {
		return map[string]any{"state": "unknown"}
	}
	return map[string]any{
		"id": saga.ID, "commandId": saga.CommandID, "operation": saga.Operation,
		"specialRequestId": saga.SpecialRequestID, "state": saga.State,
		"attemptCount": saga.AttemptCount, "remoteReference": saga.RemoteReference,
		"lastError": saga.LastError, "nextAttemptAt": saga.NextAttemptAt,
		"completedAt": saga.CompletedAt,
	}
}

func marshalSpecialRequest(req *specialrequests.SpecialRequest) map[string]any {
	return map[string]any{
		"id":                       req.ID,
		"clientId":                 req.ClientID,
		"requestType":              req.RequestType,
		"status":                   req.Status,
		"version":                  req.Version,
		"workflowStage":            req.WorkflowStage,
		"customerNotes":            req.CustomerNotes,
		"wltQuoteId":               req.WltQuoteID,
		"wltQuotePolicyId":         req.WltQuotePolicyID,
		"wltQuotePolicyVersion":    req.WltQuotePolicyVersion,
		"wltQuoteVersion":          req.WltQuoteVersion,
		"wltQuoteAmountMinorUnits": req.WltQuoteAmountMinorUnits,
		"wltQuoteCurrency":         req.WltQuoteCurrency,
		"wltQuoteHash":             req.WltQuoteHash,
		"wltQuoteExpiresAt":        req.WltQuoteExpiresAt,
		"wltPaymentSessionId":      req.WltPaymentSessionID,
		"lastWltStatus":            req.LastWltStatus,
		"lastWltEventAt":           req.LastWltEventAt,
		"correlationId":            req.CorrelationID,
		"productUrl":               req.ProductUrl,
		"quantity":                 req.Quantity,
		"size":                     req.Size,
		"color":                    req.Color,
		"variantNotes":             req.VariantNotes,
		"deliveryAddressReference": req.DeliveryAddressReference,
		"pickupAddressReference":   req.PickupAddressReference,
		"dropoffAddressReference":  req.DropoffAddressReference,
		"pickupLocation":           req.PickupLocation,
		"dropoffLocation":          req.DropoffLocation,
		"itemType":                 req.ItemType,
		"scheduleMode":             req.ScheduleMode,
		"scheduledAt":              req.ScheduledAt,
		"handlingRequirements":     req.HandlingRequirements,
		"assignedOperatorId":       req.AssignedOperatorID,
		"dispatchAssignmentId":     req.DispatchAssignmentID,
		"rejectionReason":          req.RejectionReason,
		"createdAt":                req.CreatedAt,
		"updatedAt":                req.UpdatedAt,
		"completedAt":              req.CompletedAt,
		"cancelledAt":              req.CancelledAt,
		"wltQuoteIssuedAt":         req.WltQuoteIssuedAt,
		"customerApprovedAt":       req.CustomerApprovedAt,
		"purchaseBatchId":          req.PurchaseBatchID,
		"purchasedAt":              req.PurchasedAt,
		"inboundReference":         req.InboundReference,
		"inboundReceivedAt":        req.InboundReceivedAt,
		"sortingStartedAt":         req.SortingStartedAt,
		"sortingCompletedAt":       req.SortingCompletedAt,
		"fulfillmentPreparedAt":    req.FulfillmentPreparedAt,
		"readyForDeliveryAt":       req.ReadyForDeliveryAt,
		"captainAssignedAt":        req.CaptainAssignedAt,
		"pickedUpAt":               req.PickedUpAt,
		"deliveredAt":              req.DeliveredAt,
		"mediaId":                  req.MediaID,
		"safetyStatus":             req.SafetyStatus,
		"moderationNote":           req.ModerationNote,
		"isUnsafeContent":          req.IsUnsafeContent,
	}
}

type createSpecialRequestBody struct {
	RequestType              specialrequests.RequestType `json:"requestType"`
	IdempotencyKey           string                      `json:"idempotencyKey"`
	CustomerNotes            *string                     `json:"customerNotes"`
	ProductUrl               *string                     `json:"productUrl"`
	Quantity                 *int                        `json:"quantity"`
	Size                     *string                     `json:"size"`
	Color                    *string                     `json:"color"`
	VariantNotes             *string                     `json:"variantNotes"`
	DeliveryAddressReference *string                     `json:"deliveryAddressReference"`
	PickupAddressReference   *string                     `json:"pickupAddressReference"`
	DropoffAddressReference  *string                     `json:"dropoffAddressReference"`
	PickupLocation           json.RawMessage             `json:"pickupLocation"`
	DropoffLocation          json.RawMessage             `json:"dropoffLocation"`
	ItemType                 *string                     `json:"itemType"`
	ScheduleMode             *string                     `json:"scheduleMode"`
	ScheduledAt              *time.Time                  `json:"scheduledAt"`
	HandlingRequirements     *string                     `json:"handlingRequirements"`
	MediaID                  *string                     `json:"mediaId"`
}

// POST /dsh/client/special-requests
func (s *protectedStoreServer) handleCreateSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body createSpecialRequestBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.IdempotencyKey) == "" {
		body.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	}

	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	input := specialrequests.CreateInput{
		RequestType:              body.RequestType,
		IdempotencyKey:           body.IdempotencyKey,
		CorrelationID:            specialRequestCorrelationID(r),
		CustomerNotes:            body.CustomerNotes,
		ProductUrl:               body.ProductUrl,
		Quantity:                 body.Quantity,
		Size:                     body.Size,
		Color:                    body.Color,
		VariantNotes:             body.VariantNotes,
		DeliveryAddressReference: body.DeliveryAddressReference,
		PickupAddressReference:   body.PickupAddressReference,
		DropoffAddressReference:  body.DropoffAddressReference,
		PickupLocation:           body.PickupLocation,
		DropoffLocation:          body.DropoffLocation,
		ItemType:                 body.ItemType,
		ScheduleMode:             body.ScheduleMode,
		ScheduledAt:              body.ScheduledAt,
		HandlingRequirements:     body.HandlingRequirements,
		MediaID:                  body.MediaID,
	}
	req, err := svc.CreateInOperatorContext(r.Context(), actor.OperatorContextID, actor.ID, input)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(req))
}

// GET /dsh/client/special-requests
func (s *protectedStoreServer) handleListClientSpecialRequests(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	reqs, total, err := svc.ListForClientInOperatorContext(r.Context(), actor.OperatorContextID, actor.ID, limit, offset)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	var results []map[string]any
	for _, req := range reqs {
		results = append(results, marshalSpecialRequest(&req))
	}
	if results == nil {
		results = make([]map[string]any, 0)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"requests": results,
		"total":    total,
	})
}

// GET /dsh/client/special-requests/{requestId}
func (s *protectedStoreServer) handleGetClientSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	req, err := svc.GetForClientInOperatorContext(r.Context(), actor.OperatorContextID, reqID, actor.ID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(req))
}

type cancelSpecialRequestBody struct {
	ExpectedVersion *int `json:"expectedVersion"`
}

// POST /dsh/client/special-requests/{requestId}/cancel
func (s *protectedStoreServer) handleCancelClientSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	var body cancelSpecialRequestBody
	if !decodeOptionalProtectedJSON(w, r, &body) {
		return
	}
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	current, err := svc.GetForClientInOperatorContext(r.Context(), actor.OperatorContextID, reqID, actor.ID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	if current.Status != specialrequests.StatusSubmitted && current.Status != specialrequests.StatusUnderReview && current.Status != specialrequests.StatusNeedsCustomerInput && current.Status != specialrequests.StatusApproved {
		writeSpecialRequestError(w, fmt.Errorf("%w: cannot cancel from status %s", specialrequests.ErrConflict, current.Status), "special request not found")
		return
	}
	paymentSessionID := ""
	if current.WltPaymentSessionID != nil {
		paymentSessionID = *current.WltPaymentSessionID
	}
	commandID := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if commandID == "" {
		commandID = "special-request-cancel-" + reqID
	}
	saga, _, err := specialrequests.StartCancelSaga(r.Context(), s.db, specialrequests.CancelSagaInput{
		OperatorContextID: actor.OperatorContextID, SpecialRequestID: reqID, ClientID: actor.ID,
		ExpectedVersion: body.ExpectedVersion, CommandID: commandID, CorrelationID: r.Header.Get("X-Correlation-ID"),
		PaymentSessionID: paymentSessionID, Reason: "client cancelled special request",
	})
	if err != nil {
		writeSpecialRequestError(w, err, "special request cancellation could not be started")
		return
	}
	if saga.State == specialrequests.SagaRequested {
		if err := specialrequests.ActivateSaga(r.Context(), s.db, saga.ID); err != nil {
			writeSpecialRequestError(w, err, "special request cancellation could not be started")
			return
		}
	}
	saga, err = specialrequests.DispatchSpecialRequestSaga(r.Context(), s.db, s.wlt, saga.ID)
	if err != nil && !errors.Is(err, specialrequests.ErrSagaBusy) {
		writeSpecialRequestError(w, err, "special request cancellation could not be completed")
		return
	}
	if saga != nil && saga.State == specialrequests.SagaCompleted {
		updated, readErr := svc.GetForClientInOperatorContext(r.Context(), actor.OperatorContextID, reqID, actor.ID)
		if readErr != nil {
			writeSpecialRequestError(w, readErr, "special request not found")
			return
		}
		store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"saga": marshalSpecialRequestSaga(saga)})
}

type approveSpecialRequestQuoteBody struct {
	ExpectedVersion *int `json:"expectedVersion"`
}

// POST /dsh/client/special-requests/{requestId}/approve-quote
//
// Client-initiated approval of an operator-set quote: hands the request off
// to WLT for a payment session (official_wallet, DSH-owned store id for
// special requests), then stamps the returned session id onto the request.
// Mirrors handleCreateCheckoutIntent's WLT handoff shape.
func (s *protectedStoreServer) handleApproveSpecialRequestQuote(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	var body approveSpecialRequestQuoteBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.ExpectedVersion == nil {
		writeSpecialRequestError(w, fmt.Errorf("%w: expectedVersion is required", specialrequests.ErrInvalid), "special request not found")
		return
	}

	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	req, err := svc.GetForClientInOperatorContext(r.Context(), actor.OperatorContextID, reqID, actor.ID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	if req.Status != specialrequests.StatusNeedsCustomerInput || req.WorkflowStage == nil || *req.WorkflowStage != "customer_approval" {
		writeSpecialRequestError(w, fmt.Errorf("%w: quote approval requires customer_approval stage", specialrequests.ErrConflict), "special request not found")
		return
	}
	if req.WltQuoteID == nil || req.WltQuoteAmountMinorUnits == nil || req.WltQuoteCurrency == nil {
		writeSpecialRequestError(w, fmt.Errorf("%w: quote not yet set", specialrequests.ErrInvalid), "special request not found")
		return
	}

	if s.wlt == nil || !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_HANDOFF_UNAVAILABLE", "WLT payment-session handoff is unavailable")
		return
	}
	commandID := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if commandID == "" {
		commandID = "special-request-payment-" + reqID
	}
	saga, _, err := specialrequests.StartPaymentSessionSaga(r.Context(), s.db, specialrequests.PaymentSessionSagaInput{
		OperatorContextID: actor.OperatorContextID, SpecialRequestID: reqID, ClientID: actor.ID,
		ExpectedVersion: *body.ExpectedVersion, CommandID: commandID, CorrelationID: r.Header.Get("X-Correlation-ID"),
		StoreID: "dsh-special-requests", PaymentMethod: "official_wallet", PricingQuoteID: *req.WltQuoteID,
		AmountMinorUnits: *req.WltQuoteAmountMinorUnits, Currency: *req.WltQuoteCurrency,
	})
	if err != nil {
		writeSpecialRequestError(w, err, "special request payment could not be started")
		return
	}
	if saga.State == specialrequests.SagaRequested {
		if err := specialrequests.ActivateSaga(r.Context(), s.db, saga.ID); err != nil {
			writeSpecialRequestError(w, err, "special request payment could not be started")
			return
		}
	}
	saga, err = specialrequests.DispatchSpecialRequestSaga(r.Context(), s.db, s.wlt, saga.ID)
	if err != nil && !errors.Is(err, specialrequests.ErrSagaBusy) {
		writeSpecialRequestError(w, err, "special request payment could not be completed")
		return
	}
	if saga != nil && saga.State == specialrequests.SagaCompleted {
		updated, readErr := svc.GetForClientInOperatorContext(r.Context(), actor.OperatorContextID, reqID, actor.ID)
		if readErr != nil {
			writeSpecialRequestError(w, readErr, "special request not found")
			return
		}
		store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"saga": marshalSpecialRequestSaga(saga)})
}

// GET /dsh/operator/special-requests
func (s *protectedStoreServer) handleListOperatorSpecialRequests(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	var reqType *string
	if rt := r.URL.Query().Get("requestType"); rt != "" {
		reqType = &rt
	}
	var status *string
	if st := r.URL.Query().Get("status"); st != "" {
		status = &st
	}
	var workflowStage *string
	if ws := r.URL.Query().Get("workflowStage"); ws != "" {
		workflowStage = &ws
	}
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	reqs, total, err := svc.ListForOperatorInOperatorContext(r.Context(), actor.OperatorContextID, reqType, status, workflowStage, limit, offset)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	var results []map[string]any
	for _, req := range reqs {
		results = append(results, marshalSpecialRequest(&req))
	}
	if results == nil {
		results = make([]map[string]any, 0)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"requests": results,
		"total":    total,
	})
}

// GET /dsh/operator/special-requests/{requestId}
func (s *protectedStoreServer) handleGetOperatorSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	req, err := svc.GetForOperatorInOperatorContext(r.Context(), actor.OperatorContextID, reqID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(req))
}

type updateSpecialRequestBody struct {
	Status                   *specialrequests.RequestStatus `json:"status"`
	WorkflowStage            *string                        `json:"workflowStage"`
	AssignedOperatorID       *string                        `json:"assignedOperatorId"`
	RejectionReason          *string                        `json:"rejectionReason"`
	QuotePolicyID            *string                        `json:"quotePolicyId"`
	ProposedAmountMinorUnits *int64                         `json:"proposedAmountMinorUnits"`
	ProposedCurrency         *string                        `json:"proposedCurrency"`
	ProposalReason           *string                        `json:"proposalReason"`
	CustomerApprovedAt       *time.Time                     `json:"customerApprovedAt"`
	PurchaseBatchID          *string                        `json:"purchaseBatchId"`
	PurchasedAt              *time.Time                     `json:"purchasedAt"`
	InboundReference         *string                        `json:"inboundReference"`
	InboundReceivedAt        *time.Time                     `json:"inboundReceivedAt"`
	SortingStartedAt         *time.Time                     `json:"sortingStartedAt"`
	SortingCompletedAt       *time.Time                     `json:"sortingCompletedAt"`
	FulfillmentPreparedAt    *time.Time                     `json:"fulfillmentPreparedAt"`
	ReadyForDeliveryAt       *time.Time                     `json:"readyForDeliveryAt"`
	CaptainAssignedAt        *time.Time                     `json:"captainAssignedAt"`
	PickedUpAt               *time.Time                     `json:"pickedUpAt"`
	DeliveredAt              *time.Time                     `json:"deliveredAt"`
	SafetyStatus             *string                        `json:"safetyStatus"`
	ModerationNote           *string                        `json:"moderationNote"`
	IsUnsafeContent          *bool                          `json:"isUnsafeContent"`
	ExpectedVersion          *int                           `json:"expectedVersion"`
}

// PATCH /dsh/operator/special-requests/{requestId}
func (s *protectedStoreServer) handleUpdateOperatorSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	var body updateSpecialRequestBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.ExpectedVersion == nil {
		writeSpecialRequestError(w, fmt.Errorf("%w: expectedVersion is required", specialrequests.ErrInvalid), "special request not found")
		return
	}

	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	current, err := svc.GetForOperatorInOperatorContext(r.Context(), actor.OperatorContextID, reqID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	proposalRequested := body.QuotePolicyID != nil || body.ProposedAmountMinorUnits != nil || body.ProposedCurrency != nil || body.ProposalReason != nil
	if proposalRequested && (body.QuotePolicyID == nil || body.ProposedAmountMinorUnits == nil || body.ProposedCurrency == nil || body.ProposalReason == nil) {
		writeSpecialRequestError(w, fmt.Errorf("%w: quotePolicyId, proposedAmountMinorUnits, proposedCurrency and proposalReason are required together", specialrequests.ErrInvalid), "special request not found")
		return
	}
	input := specialrequests.UpdateInput{
		ActorID:                actor.ID,
		QuoteProposalRequested: proposalRequested,
		Status:                 body.Status,
		WorkflowStage:          body.WorkflowStage,
		AssignedOperatorID:     body.AssignedOperatorID,
		RejectionReason:        body.RejectionReason,
		CustomerApprovedAt:     body.CustomerApprovedAt,
		PurchaseBatchID:        body.PurchaseBatchID,
		PurchasedAt:            body.PurchasedAt,
		InboundReference:       body.InboundReference,
		InboundReceivedAt:      body.InboundReceivedAt,
		SortingStartedAt:       body.SortingStartedAt,
		SortingCompletedAt:     body.SortingCompletedAt,
		FulfillmentPreparedAt:  body.FulfillmentPreparedAt,
		ReadyForDeliveryAt:     body.ReadyForDeliveryAt,
		CaptainAssignedAt:      body.CaptainAssignedAt,
		PickedUpAt:             body.PickedUpAt,
		DeliveredAt:            body.DeliveredAt,
		SafetyStatus:           body.SafetyStatus,
		ModerationNote:         body.ModerationNote,
		IsUnsafeContent:        body.IsUnsafeContent,
	}
	idempotencyKey := ""
	if proposalRequested {
		if s.wlt == nil || !s.wlt.Configured() {
			store.SendError(w, http.StatusServiceUnavailable, "WLT_HANDOFF_UNAVAILABLE", "WLT quote handoff is unavailable")
			return
		}
		idempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
			writeSpecialRequestError(w, fmt.Errorf("%w: Idempotency-Key must contain between 8 and 200 characters", specialrequests.ErrInvalid), "special request not found")
			return
		}
		status := specialrequests.StatusNeedsCustomerInput
		stage := "customer_approval"
		input.Status = &status
		input.WorkflowStage = &stage
	}
	if !proposalRequested {
		updated, err := svc.ApplyOperatorTransitionInOperatorContext(r.Context(), actor.OperatorContextID, reqID, *body.ExpectedVersion, input)
		if err != nil {
			writeSpecialRequestError(w, err, "special request not found")
			return
		}
		store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
		return
	}
	correlation := specialRequestCorrelationID(r)
	saga, _, err := specialrequests.StartQuoteSaga(r.Context(), s.db, specialrequests.QuoteSagaInput{
		OperatorContextID: actor.OperatorContextID, SpecialRequestID: reqID, ClientID: current.ClientID,
		ExpectedVersion: *body.ExpectedVersion, CommandID: idempotencyKey, CorrelationID: *correlation,
		PolicyID: *body.QuotePolicyID, ProposedAmountMinorUnits: *body.ProposedAmountMinorUnits,
		ProposedCurrency: *body.ProposedCurrency, ProposalReason: *body.ProposalReason,
	})
	if err != nil {
		writeSpecialRequestError(w, err, "special request quote could not be started")
		return
	}
	if saga.State == specialrequests.SagaRequested {
		fresh, readErr := svc.GetForOperatorInOperatorContext(r.Context(), actor.OperatorContextID, reqID)
		if readErr != nil {
			writeSpecialRequestError(w, readErr, "special request not found")
			return
		}
		if fresh.Status != specialrequests.StatusNeedsCustomerInput || fresh.WorkflowStage == nil || *fresh.WorkflowStage != "customer_approval" {
			if _, err := svc.ApplyOperatorTransitionInOperatorContext(r.Context(), actor.OperatorContextID, reqID, *body.ExpectedVersion, input); err != nil {
				writeSpecialRequestError(w, err, "special request not found")
				return
			}
		}
		if err := specialrequests.ActivateSaga(r.Context(), s.db, saga.ID); err != nil {
			writeSpecialRequestError(w, err, "special request quote could not be activated")
			return
		}
	}
	saga, err = specialrequests.DispatchSpecialRequestSaga(r.Context(), s.db, s.wlt, saga.ID)
	if err != nil && !errors.Is(err, specialrequests.ErrSagaBusy) {
		writeSpecialRequestError(w, err, "special request quote could not be completed")
		return
	}
	if saga != nil && saga.State == specialrequests.SagaCompleted {
		updated, readErr := svc.GetForOperatorInOperatorContext(r.Context(), actor.OperatorContextID, reqID)
		if readErr != nil {
			writeSpecialRequestError(w, readErr, "special request not found")
			return
		}
		store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"saga": marshalSpecialRequestSaga(saga)})
}

type assignSpecialRequestDispatchBody struct {
	CaptainID string `json:"captainId"`
}

// POST /dsh/operator/special-requests/{requestId}/dispatch
//
// Dispatches an approved special request (SHEIN assisted purchase or Awnak
// errand) to a captain, creating a dsh_assignments/dsh_deliveries pair
// sourced from special_request_id (order_id NULL) and moving the request's
// status from approved -> assigned. Uses the same operator permission check
// as handleUpdateOperatorSpecialRequest since this is also an operator-only
// mutation of a special request's dispatch state.
func (s *protectedStoreServer) handleAssignSpecialRequestDispatch(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	if err := store.EnforceKillSwitch(r.Context(), s.decisionService, "dispatch_assignment", actor.ID); err != nil {
		store.SendError(w, http.StatusForbidden, "KILL_SWITCH_ACTIVE", err.Error())
		return
	}
	reqID := r.PathValue("requestId")
	var body assignSpecialRequestDispatchBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignment, err := dispatch.CreateAssignmentForSpecialRequest(s.db, dispatch.CreateAssignmentInput{
		SpecialRequestID:  reqID,
		OperatorContextID: actor.OperatorContextID,
		CaptainID:         body.CaptainID,
		ActorID:           actor.ID,
	})
	if err != nil {
		var notReady *specialrequests.ErrDispatchNotReady
		switch {
		case errors.As(err, &notReady):
			store.SendJSON(w, http.StatusConflict, map[string]any{
				"code":            "SPECIAL_REQUEST_NOT_READY_FOR_DISPATCH",
				"message":         notReady.Error(),
				"currentStage":    notReady.Readiness.CurrentStage,
				"requiredStage":   notReady.Readiness.RequiredStage,
				"blockingReasons": notReady.Readiness.BlockingReasons,
			})
		case errors.Is(err, dispatch.ErrNotFound):
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
		case errors.Is(err, dispatch.ErrConflict):
			store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
		case errors.Is(err, dispatch.ErrInvalid):
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		default:
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "special request dispatch failed")
		}
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"assignment": marshalDispatchAssignment(*assignment)})
}

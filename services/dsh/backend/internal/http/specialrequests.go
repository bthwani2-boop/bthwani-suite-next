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
	"dsh-api/internal/wlt"

	"github.com/google/uuid"
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

func marshalSpecialRequest(req *specialrequests.SpecialRequest) map[string]any {
	return map[string]any{
		"id":                        req.ID,
		"clientId":                  req.ClientID,
		"requestType":               req.RequestType,
		"status":                    req.Status,
		"version":                   req.Version,
		"workflowStage":             req.WorkflowStage,
		"customerNotes":             req.CustomerNotes,
		"currency":                  req.Currency,
		"estimatedAmountReference":  req.EstimatedAmountReference,
		"estimatedAmountMinorUnits": req.EstimatedAmountMinorUnits,
		"wltPaymentSessionId":       req.WltPaymentSessionID,
		"correlationId":             req.CorrelationID,
		"productUrl":                req.ProductUrl,
		"quantity":                  req.Quantity,
		"size":                      req.Size,
		"color":                     req.Color,
		"variantNotes":              req.VariantNotes,
		"deliveryAddressReference":  req.DeliveryAddressReference,
		"pickupAddressReference":    req.PickupAddressReference,
		"dropoffAddressReference":   req.DropoffAddressReference,
		"pickupLocation":            req.PickupLocation,
		"dropoffLocation":           req.DropoffLocation,
		"itemType":                  req.ItemType,
		"scheduleMode":              req.ScheduleMode,
		"scheduledAt":               req.ScheduledAt,
		"handlingRequirements":      req.HandlingRequirements,
		"assignedOperatorId":        req.AssignedOperatorID,
		"dispatchAssignmentId":      req.DispatchAssignmentID,
		"rejectionReason":           req.RejectionReason,
		"createdAt":                 req.CreatedAt,
		"updatedAt":                 req.UpdatedAt,
		"completedAt":               req.CompletedAt,
		"cancelledAt":               req.CancelledAt,
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
	}
	req, err := svc.Create(r.Context(), actor.ID, input)
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
	reqs, total, err := svc.ListForClient(r.Context(), actor.ID, limit, offset)
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
	req, err := svc.GetForClient(r.Context(), reqID, actor.ID)
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
	svc.SetWltClient(s.wlt)
	updated, err := svc.CancelForClient(r.Context(), reqID, actor.ID, body.ExpectedVersion)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
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
	req, err := svc.GetForClient(r.Context(), reqID, actor.ID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	if req.Status != specialrequests.StatusUnderReview && req.Status != specialrequests.StatusNeedsCustomerInput {
		writeSpecialRequestError(w, fmt.Errorf("%w: cannot approve quote from status %s", specialrequests.ErrConflict, req.Status), "special request not found")
		return
	}
	if req.EstimatedAmountMinorUnits == nil || req.Currency == nil {
		writeSpecialRequestError(w, fmt.Errorf("%w: quote not yet set", specialrequests.ErrInvalid), "special request not found")
		return
	}

	paymentSession, err := s.wlt.CreatePaymentSession(r.Context(), wlt.CreatePaymentSessionInput{
		SpecialRequestID: reqID,
		ClientID:         actor.ID,
		StoreID:          "dsh-special-requests",
		PaymentMethod:    "official_wallet",
		AmountMinorUnits: *req.EstimatedAmountMinorUnits,
		Currency:         *req.Currency,
		CorrelationID:    r.Header.Get("X-Correlation-ID"),
	})
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_HANDOFF_UNAVAILABLE", "WLT payment-session handoff is unavailable")
		return
	}

	updated, err := svc.AttachWltPaymentSession(r.Context(), reqID, *body.ExpectedVersion, paymentSession.ID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
}

// GET /dsh/operator/special-requests
func (s *protectedStoreServer) handleListOperatorSpecialRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
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
	reqs, total, err := svc.ListForOperator(r.Context(), reqType, status, workflowStage, limit, offset)
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
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	req, err := svc.GetForOperator(r.Context(), reqID)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(req))
}

type updateSpecialRequestBody struct {
	Status                    *specialrequests.RequestStatus `json:"status"`
	WorkflowStage             *string                        `json:"workflowStage"`
	AssignedOperatorID        *string                        `json:"assignedOperatorId"`
	RejectionReason           *string                        `json:"rejectionReason"`
	EstimatedAmountMinorUnits *int64                         `json:"estimatedAmountMinorUnits"`
	Currency                  *string                        `json:"currency"`
	WltPaymentSessionID       *string                        `json:"wltPaymentSessionId"`
	ExpectedVersion           *int                           `json:"expectedVersion"`
}

// PATCH /dsh/operator/special-requests/{requestId}
func (s *protectedStoreServer) handleUpdateOperatorSpecialRequest(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
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
	input := specialrequests.UpdateInput{
		Status:                    body.Status,
		WorkflowStage:             body.WorkflowStage,
		AssignedOperatorID:        body.AssignedOperatorID,
		RejectionReason:           body.RejectionReason,
		EstimatedAmountMinorUnits: body.EstimatedAmountMinorUnits,
		Currency:                  body.Currency,
		WltPaymentSessionID:       body.WltPaymentSessionID,
	}
	updated, err := svc.ApplyOperatorTransition(r.Context(), reqID, *body.ExpectedVersion, input)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
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
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	var body assignSpecialRequestDispatchBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignment, err := dispatch.CreateAssignmentForSpecialRequest(s.db, dispatch.CreateAssignmentInput{
		SpecialRequestID: reqID,
		CaptainID:        body.CaptainID,
		ActorID:          actor.ID,
	})
	if err != nil {
		switch {
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

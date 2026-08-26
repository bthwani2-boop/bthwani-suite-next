package http

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

const wltStoreOnboardingFeePolicyPath = "/wlt/commercial/store-onboarding-fee"

type storeOnboardingFeePolicyWriteInput struct {
	Enabled          bool       `json:"enabled"`
	AmountMinorUnits int64      `json:"amountMinorUnits"`
	Currency         string     `json:"currency"`
	AppliesTo        string     `json:"appliesTo"`
	ChargeTiming     string     `json:"chargeTiming"`
	EffectiveFrom    *time.Time `json:"effectiveFrom,omitempty"`
	Notes            string     `json:"notes,omitempty"`
	ExpectedVersion  int        `json:"expectedVersion"`
	Reason           string     `json:"reason"`
}

type trustedStoreOnboardingFeePolicyWriteInput struct {
	Enabled          bool       `json:"enabled"`
	AmountMinorUnits int64      `json:"amountMinorUnits"`
	Currency         string     `json:"currency"`
	AppliesTo        string     `json:"appliesTo"`
	ChargeTiming     string     `json:"chargeTiming"`
	EffectiveFrom    *time.Time `json:"effectiveFrom,omitempty"`
	Notes            string     `json:"notes,omitempty"`
	ExpectedVersion  int        `json:"expectedVersion"`
	Reason           string     `json:"reason"`
	CreatedByActorID string     `json:"createdByActorId"`
}

func writeStoreOnboardingFeeProxyResponse(w http.ResponseWriter, status int, body []byte, err error) {
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Pragma", "no-store")
	writeFinanceResponse(w, status, body, err)
}

func decodeStoreOnboardingFeePolicyWrite(w http.ResponseWriter, r *http.Request) (storeOnboardingFeePolicyWriteInput, bool) {
	var input storeOnboardingFeePolicyWriteInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "request body is invalid")
		return storeOnboardingFeePolicyWriteInput{}, false
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "request body must contain exactly one JSON object")
		return storeOnboardingFeePolicyWriteInput{}, false
	}
	return input, true
}

func (s *protectedStoreServer) proxyStoreOnboardingFeePolicyRead(w http.ResponseWriter, r *http.Request, operatorContextID string) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), operatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(
		trustedContext,
		"finance.store_onboarding_fee.read",
		nil,
		nil,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	writeStoreOnboardingFeeProxyResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleGetStoreOnboardingFeePolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead)
	if !ok {
		return
	}
	s.proxyStoreOnboardingFeePolicyRead(w, r, actor.OperatorContextID)
}

func (s *protectedStoreServer) handleUpsertStoreOnboardingFeePolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage)
	if !ok {
		return
	}
	operatorContextID := strings.TrimSpace(actor.OperatorContextID)
	actorID := strings.TrimSpace(actor.ID)
	if operatorContextID == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	if actorID == "" || len(actorID) > 200 {
		store.SendError(w, http.StatusForbidden, "ACTOR_ID_REQUIRED", "trusted operator identity is required")
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(correlationID) < 8 || len(correlationID) > 200 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", "X-Correlation-ID must contain 8 to 200 characters")
		return
	}
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain 8 to 200 characters")
		return
	}
	input, ok := decodeStoreOnboardingFeePolicyWrite(w, r)
	if !ok {
		return
	}
	payload, err := json.Marshal(trustedStoreOnboardingFeePolicyWriteInput{
		Enabled:          input.Enabled,
		AmountMinorUnits: input.AmountMinorUnits,
		Currency:         input.Currency,
		AppliesTo:        input.AppliesTo,
		ChargeTiming:     input.ChargeTiming,
		EffectiveFrom:    input.EffectiveFrom,
		Notes:            input.Notes,
		ExpectedVersion:  input.ExpectedVersion,
		Reason:           input.Reason,
		CreatedByActorID: actorID,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode store onboarding fee policy")
		return
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), operatorContextID)
	status, body, err := s.wlt.ExecuteFinanceWrite(
		trustedContext,
		"finance.store_onboarding_fee.upsert",
		nil,
		payload,
		correlationID,
		idempotencyKey,
		operatorContextID,
		actorID,
	)
	writeStoreOnboardingFeeProxyResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleGetStoreOnboardingFeeReference(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field", "partner")
	if !ok {
		return
	}
	s.proxyStoreOnboardingFeePolicyRead(w, r, actor.OperatorContextID)
}

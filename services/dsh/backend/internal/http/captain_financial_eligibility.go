package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

const captainFinancialDecisionTTLSeconds = 300

type wltCaptainWalletEnvelope struct {
	Wallet *struct {
		ID        string    `json:"id"`
		ActorID   string    `json:"actorId"`
		ActorType string    `json:"actorType"`
		Status    string    `json:"status"`
		UpdatedAt time.Time `json:"updatedAt"`
	} `json:"wallet"`
}

func (s *protectedStoreServer) refreshCaptainFinancialEligibility(
	r *http.Request,
	operatorContextID string,
	captainID string,
) (dispatch.CaptainFinancialEligibilitySnapshot, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("%w: operatorContextId is required", dispatch.ErrInvalid)
	}
	captainID = strings.TrimSpace(captainID)
	if captainID == "" {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("%w: captain id is required", dispatch.ErrInvalid)
	}
	if s.wlt == nil || !s.wlt.Configured() {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("WLT integration is not configured")
	}

	status, body, err := s.wlt.FinanceReadWalletWithOperatorContext(
		r.Context(),
		"captain",
		captainID,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	if err != nil {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, err
	}
	if status != http.StatusOK {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("WLT wallet read failed with status %d", status)
	}

	var envelope wltCaptainWalletEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("decode WLT captain wallet reference: %w", err)
	}
	if envelope.Wallet == nil || envelope.Wallet.ActorID != captainID || envelope.Wallet.ActorType != "captain" {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("WLT captain wallet identity mismatch")
	}
	updatedAt := envelope.Wallet.UpdatedAt.UTC()
	if updatedAt.IsZero() {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("WLT captain wallet is missing updatedAt")
	}

	reasonCode := "WLT_WALLET_ACTIVE"
	eligible := strings.EqualFold(strings.TrimSpace(envelope.Wallet.Status), "active")
	ineligibilityReason := ""
	if !eligible {
		reasonCode = "WLT_WALLET_NOT_ACTIVE"
		ineligibilityReason = reasonCode
	}
	decisionID := fmt.Sprintf("wlt-wallet-status:%s:%s", envelope.Wallet.ID, updatedAt.Format(time.RFC3339Nano))

	return dispatch.UpsertCaptainFinancialEligibilityDecision(
		r.Context(),
		s.db,
		operatorContextID,
		captainID,
		dispatch.CaptainWltFinancialEligibilityDecision{
			WltDecisionID:       decisionID,
			WltReasonCode:       reasonCode,
			WltPolicyVersion:    "wallet-status@1",
			Eligible:            eligible,
			IneligibilityReason: ineligibilityReason,
			SnapshotReference:   decisionID,
			EvaluatedAt:         updatedAt,
			TTLSeconds:          captainFinancialDecisionTTLSeconds,
		},
	)
}

func (s *protectedStoreServer) handleGetDispatchBalancePolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead); !ok {
		return
	}
	store.SendError(w, http.StatusGone, "DISPATCH_BALANCE_POLICY_OWNED_BY_WLT", "captain dispatch financial thresholds and wallet policy are owned by WLT; DSH stores only WLT eligibility decision metadata")
}

func (s *protectedStoreServer) handleUpsertDispatchBalancePolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage); !ok {
		return
	}
	store.SendError(w, http.StatusGone, "DISPATCH_BALANCE_POLICY_OWNED_BY_WLT", "captain dispatch financial thresholds and wallet policy are owned by WLT; DSH stores only WLT eligibility decision metadata")
}

func (s *protectedStoreServer) handleRefreshOperatorCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage)
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	snapshot, err := s.refreshCaptainFinancialEligibility(r, operatorContextID, r.PathValue("captainId"))
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot)
}

func (s *protectedStoreServer) handleGetOperatorCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead)
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	snapshot, err := dispatch.GetCaptainFinancialEligibilitySnapshot(
		r.Context(), s.db, operatorContextID, r.PathValue("captainId"),
	)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot)
}

func (s *protectedStoreServer) handleRefreshOwnCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OperatorContext_REQUIRED", "captain OperatorContext context is required")
		return
	}
	snapshot, err := s.refreshCaptainFinancialEligibility(r, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot)
}

func (s *protectedStoreServer) handleGetOwnCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OperatorContext_REQUIRED", "captain OperatorContext context is required")
		return
	}
	snapshot, err := dispatch.GetCaptainFinancialEligibilitySnapshot(r.Context(), s.db, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot)
}

func writeCaptainFinancialEligibilityError(w http.ResponseWriter, err error) {
	switch {
	case err == nil:
		return
	case strings.Contains(err.Error(), dispatch.ErrInvalid.Error()):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case strings.Contains(err.Error(), dispatch.ErrNotFound.Error()):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "captain financial eligibility was not found")
	case strings.Contains(err.Error(), dispatch.ErrConflict.Error()):
		store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
	default:
		store.SendError(w, http.StatusBadGateway, "WLT_ELIGIBILITY_UNAVAILABLE", "captain financial eligibility could not be refreshed")
	}
}

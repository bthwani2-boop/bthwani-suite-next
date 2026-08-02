package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

type wltCaptainWalletEnvelope struct {
	Wallet *struct {
		ID                         string    `json:"id"`
		ActorID                    string    `json:"actorId"`
		ActorType                  string    `json:"actorType"`
		Status                     string    `json:"status"`
		Currency                   string    `json:"currency"`
		AvailableBalanceMinorUnits int64     `json:"availableBalanceMinorUnits"`
		UpdatedAt                  time.Time `json:"updatedAt"`
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

	policy, err := platformpolicies.GetDispatchBalancePolicy(r.Context(), s.db)
	if err != nil {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, err
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
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("decode WLT captain wallet: %w", err)
	}
	if envelope.Wallet == nil || envelope.Wallet.ActorID != captainID || envelope.Wallet.ActorType != "captain" {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("WLT captain wallet identity mismatch")
	}
	updatedAt := envelope.Wallet.UpdatedAt.UTC()
	if updatedAt.IsZero() {
		return dispatch.CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("WLT captain wallet is missing updatedAt")
	}

	return dispatch.UpsertCaptainFinancialEligibilitySnapshot(
		r.Context(),
		s.db,
		operatorContextID,
		captainID,
		dispatch.DispatchBalanceRequirement{
			Enabled:                          policy.Enabled,
			RequirePositiveBalance:           policy.RequirePositiveBalance,
			MinimumDispatchBalanceMinorUnits: policy.MinimumDispatchBalanceMinorUnits,
			Currency:                         policy.Currency,
			SnapshotTTLSeconds:               policy.SnapshotTTLSeconds,
		},
		dispatch.CaptainWalletReadback{
			WalletID:                   envelope.Wallet.ID,
			WalletStatus:               envelope.Wallet.Status,
			AvailableBalanceMinorUnits: envelope.Wallet.AvailableBalanceMinorUnits,
			Currency:                   envelope.Wallet.Currency,
			SnapshotReference: fmt.Sprintf(
				"wlt-wallet:%s:%s",
				envelope.Wallet.ID,
				updatedAt.Format(time.RFC3339Nano),
			),
		},
	)
}

func (s *protectedStoreServer) handleGetDispatchBalancePolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	policy, err := platformpolicies.GetDispatchBalancePolicy(r.Context(), s.db)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) handleUpsertDispatchBalancePolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Enabled                          bool   `json:"enabled"`
		RequirePositiveBalance           bool   `json:"requirePositiveBalance"`
		MinimumDispatchBalanceMinorUnits int64  `json:"minimumDispatchBalanceMinorUnits"`
		MinimumCODBalanceMinorUnits      int64  `json:"minimumCodBalanceMinorUnits"`
		Currency                         string `json:"currency"`
		SnapshotTTLSeconds               int    `json:"snapshotTtlSeconds"`
		Notes                            string `json:"notes"`
		ExpectedVersion                  int    `json:"expectedVersion"`
		Reason                           string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	policy, err := platformpolicies.UpsertDispatchBalancePolicy(
		r.Context(),
		s.db,
		platformpolicies.DispatchBalancePolicyInput{
			Enabled:                          body.Enabled,
			RequirePositiveBalance:           body.RequirePositiveBalance,
			MinimumDispatchBalanceMinorUnits: body.MinimumDispatchBalanceMinorUnits,
			MinimumCODBalanceMinorUnits:      body.MinimumCODBalanceMinorUnits,
			Currency:                         body.Currency,
			SnapshotTTLSeconds:               body.SnapshotTTLSeconds,
			Notes:                            body.Notes,
			ExpectedVersion:                  body.ExpectedVersion,
		},
		mutation,
	)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) handleRefreshOperatorCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
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
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
}

func (s *protectedStoreServer) handleGetOperatorCaptainFinancialEligibility(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
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
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
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
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
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
	store.SendJSON(w, http.StatusOK, map[string]any{"financialEligibility": snapshot})
}

func writeCaptainFinancialEligibilityError(w http.ResponseWriter, err error) {
	switch {
	case err == nil:
		return
	case strings.Contains(err.Error(), "not configured") || strings.Contains(err.Error(), "WLT wallet read failed"):
		store.SendError(w, http.StatusServiceUnavailable, "WLT_FINANCIAL_ELIGIBILITY_UNAVAILABLE", "WLT wallet eligibility could not be verified")
	case strings.Contains(err.Error(), "identity mismatch") || strings.Contains(err.Error(), "missing updatedAt"):
		store.SendError(w, http.StatusConflict, "WLT_WALLET_READBACK_INVALID", "WLT wallet readback did not match the captain")
	case strings.Contains(err.Error(), dispatch.ErrCaptainNotEligible.Error()):
		store.SendError(w, http.StatusConflict, "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED", "captain financial eligibility has not been verified")
	case strings.Contains(err.Error(), dispatch.ErrInvalid.Error()):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "captain financial eligibility operation failed")
	}
}

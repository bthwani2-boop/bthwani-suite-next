package http

import (
	"errors"
	"net/http"
	"time"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

const (
	PlatformPermissionRead   = "platform.read"
	PlatformPermissionManage = "platform.manage"
)

// GET /dsh/operator/platform/store-onboarding-fee — operator edit view.
func (s *protectedStoreServer) handleGetStoreOnboardingFeePolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	policy, err := platformpolicies.GetStoreOnboardingFeePolicy(r.Context(), s.db)
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store onboarding fee policy not found")
		return
	}
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

// PUT /dsh/operator/platform/store-onboarding-fee
func (s *protectedStoreServer) handleUpsertStoreOnboardingFeePolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Enabled         bool    `json:"enabled"`
		Amount          float64 `json:"amount"`
		Currency        string  `json:"currency"`
		AppliesTo       string  `json:"appliesTo"`
		ChargeTiming    string  `json:"chargeTiming"`
		EffectiveFrom   *string `json:"effectiveFrom"`
		Notes           string  `json:"notes"`
		ExpectedVersion int     `json:"expectedVersion"`
		Reason          string  `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	input := platformpolicies.StoreOnboardingFeePolicyInput{
		Enabled: body.Enabled, Amount: body.Amount, Currency: body.Currency,
		AppliesTo: body.AppliesTo, ChargeTiming: body.ChargeTiming,
		Notes: body.Notes, ExpectedVersion: body.ExpectedVersion,
	}
	if body.EffectiveFrom != nil && *body.EffectiveFrom != "" {
		parsed, err := time.Parse(time.RFC3339, *body.EffectiveFrom)
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_EFFECTIVE_FROM", "effectiveFrom must be RFC3339")
			return
		}
		input.EffectiveFrom = &parsed
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	policy, err := platformpolicies.UpsertStoreOnboardingFeePolicy(r.Context(), s.db, input, mutation)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

// GET /dsh/platform/store-onboarding-fee — read-only reference for app-field
// and app-partner. Never exposed to app-client.
func (s *protectedStoreServer) handleGetStoreOnboardingFeeReference(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "field", "partner", "operator"); !ok {
		return
	}
	policy, err := platformpolicies.GetStoreOnboardingFeePolicy(r.Context(), s.db)
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store onboarding fee policy not found")
		return
	}
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

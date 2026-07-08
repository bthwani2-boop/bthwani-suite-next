package http

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

// GET /dsh/operator/platform/zones
func (s *protectedStoreServer) handleListZones(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	zones, err := platformpolicies.ListZones(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list zones")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"zones": zones})
}

// POST /dsh/operator/platform/zones
func (s *protectedStoreServer) handleCreateZone(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		Name        string `json:"name"`
		CityCode    string `json:"cityCode"`
		Description string `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	z, err := platformpolicies.CreateZone(s.db, body.Name, body.CityCode, body.Description)
	if errors.Is(err, platformpolicies.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "name and cityCode are required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create zone")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"zone": z})
}

// PATCH /dsh/operator/platform/zones/{zoneId}
func (s *protectedStoreServer) handleUpdateZone(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("zoneId")
	var body struct {
		IsActive    bool   `json:"isActive"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	z, err := platformpolicies.UpdateZone(s.db, id, body.IsActive, body.Name, body.Description)
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "zone not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update zone")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"zone": z})
}

// GET /dsh/operator/platform/sla-rules
func (s *protectedStoreServer) handleListSlaRules(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	zoneID := r.URL.Query().Get("zoneId")
	rules, err := platformpolicies.ListSlaRules(s.db, zoneID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list SLA rules")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"slaRules": rules})
}

// PUT /dsh/operator/platform/sla-rules
func (s *protectedStoreServer) handleUpsertSlaRules(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		ZoneID          string `json:"zoneId"`
		Category        string `json:"category"`
		MaxPrepMins     int    `json:"maxPrepMins"`
		MaxDeliveryMins int    `json:"maxDeliveryMins"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	rule, err := platformpolicies.UpsertSlaRule(s.db,
		body.ZoneID, body.Category, body.MaxPrepMins, body.MaxDeliveryMins, actor.ID)
	if errors.Is(err, platformpolicies.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "zoneId and category are required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upsert SLA rule")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"slaRule": rule})
}

// GET /dsh/operator/platform/capacity
func (s *protectedStoreServer) handleGetCapacityConfig(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	zoneID := r.URL.Query().Get("zoneId")
	cfg, err := platformpolicies.GetCapacityConfig(s.db, zoneID)
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "capacity config not found for zone")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get capacity config")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityConfig": cfg})
}

// PUT /dsh/operator/platform/capacity
func (s *protectedStoreServer) handleUpsertCapacityConfig(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		ZoneID              string `json:"zoneId"`
		MaxConcurrentOrders int    `json:"maxConcurrentOrders"`
		MaxCaptainsOnline   int    `json:"maxCaptainsOnline"`
		ThrottleThreshold   int    `json:"throttleThreshold"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	cfg, err := platformpolicies.UpsertCapacityConfig(s.db,
		body.ZoneID, body.MaxConcurrentOrders, body.MaxCaptainsOnline, body.ThrottleThreshold, actor.ID)
	if errors.Is(err, platformpolicies.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "zoneId is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upsert capacity config")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityConfig": cfg})
}

// GET /dsh/operator/platform/store-onboarding-fee — operator edit view.
func (s *protectedStoreServer) handleGetStoreOnboardingFeePolicy(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	policy, err := platformpolicies.GetStoreOnboardingFeePolicy(s.db)
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store onboarding fee policy not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get store onboarding fee policy")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

// PUT /dsh/operator/platform/store-onboarding-fee
func (s *protectedStoreServer) handleUpsertStoreOnboardingFeePolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		Enabled       bool    `json:"enabled"`
		Amount        float64 `json:"amount"`
		Currency      string  `json:"currency"`
		AppliesTo     string  `json:"appliesTo"`
		ChargeTiming  string  `json:"chargeTiming"`
		EffectiveFrom *string `json:"effectiveFrom"`
		Notes         string  `json:"notes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	input := platformpolicies.StoreOnboardingFeePolicyInput{
		Enabled:      body.Enabled,
		Amount:       body.Amount,
		Currency:     body.Currency,
		AppliesTo:    body.AppliesTo,
		ChargeTiming: body.ChargeTiming,
		Notes:        body.Notes,
	}
	if body.EffectiveFrom != nil && *body.EffectiveFrom != "" {
		if t, err := time.Parse(time.RFC3339, *body.EffectiveFrom); err == nil {
			input.EffectiveFrom = &t
		}
	}
	policy, err := platformpolicies.UpsertStoreOnboardingFeePolicy(s.db, input, actor.ID)
	if errors.Is(err, platformpolicies.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "invalid appliesTo, chargeTiming, or negative amount")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upsert store onboarding fee policy")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

// GET /dsh/platform/store-onboarding-fee — read-only reference for app-field
// and app-partner. Never for app-client.
func (s *protectedStoreServer) handleGetStoreOnboardingFeeReference(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field", "partner", "operator")
	if !ok {
		return
	}
	policy, err := platformpolicies.GetStoreOnboardingFeePolicy(s.db)
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store onboarding fee policy not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get store onboarding fee reference")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

// GET /dsh/operator/platform/serviceability/{zoneId}
func (s *protectedStoreServer) handleGetZoneServiceability(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	zoneID := r.PathValue("zoneId")
	result, err := platformpolicies.GetZoneServiceability(s.db, zoneID)
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "zone not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get serviceability")
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}

var _ = strconv.Itoa

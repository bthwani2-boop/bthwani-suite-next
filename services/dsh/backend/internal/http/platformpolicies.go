package http

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

const (
	PlatformPermissionRead   = "platform.read"
	PlatformPermissionManage = "platform.manage"
)

func (s *protectedStoreServer) handleListZones(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	includeInactive := true
	if raw := r.URL.Query().Get("includeInactive"); raw != "" {
		parsed, err := strconv.ParseBool(raw)
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_INCLUDE_INACTIVE", "includeInactive must be true or false")
			return
		}
		includeInactive = parsed
	}
	zones, err := platformpolicies.ListZones(r.Context(), s.db, includeInactive)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"zones": zones})
}

func (s *protectedStoreServer) handleCreateZone(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		CityCode    string `json:"cityCode"`
		Description string `json:"description"`
		Reason      string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	zone, err := platformpolicies.CreateZone(r.Context(), s.db, platformpolicies.CreateZoneInput{
		ID: body.ID, Name: body.Name, CityCode: body.CityCode, Description: body.Description,
	}, mutation)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"zone": zone})
}

func (s *protectedStoreServer) handleUpdateZone(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Name            *string `json:"name"`
		Description     *string `json:"description"`
		IsActive        *bool   `json:"isActive"`
		ExpectedVersion int     `json:"expectedVersion"`
		Reason          string  `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	zone, err := platformpolicies.UpdateZone(r.Context(), s.db, r.PathValue("zoneId"), platformpolicies.UpdateZoneInput{
		Name: body.Name, Description: body.Description, IsActive: body.IsActive, ExpectedVersion: body.ExpectedVersion,
	}, mutation)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"zone": zone})
}

func (s *protectedStoreServer) handleListSlaRules(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	rules, err := platformpolicies.ListSlaRules(r.Context(), s.db, r.URL.Query().Get("zoneId"))
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"slaRules": rules})
}

func (s *protectedStoreServer) handleUpsertSlaRules(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ZoneID          string `json:"zoneId"`
		Category        string `json:"category"`
		MaxPrepMins     int    `json:"maxPrepMins"`
		MaxDeliveryMins int    `json:"maxDeliveryMins"`
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	rule, err := platformpolicies.UpsertSlaRule(r.Context(), s.db, platformpolicies.UpsertSlaInput{
		ZoneID: body.ZoneID, Category: body.Category, MaxPrepMins: body.MaxPrepMins,
		MaxDeliveryMins: body.MaxDeliveryMins, ExpectedVersion: body.ExpectedVersion,
	}, mutation)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"slaRule": rule})
}

func (s *protectedStoreServer) handleGetCapacityConfig(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	config, err := platformpolicies.GetCapacity(r.Context(), s.db, r.URL.Query().Get("zoneId"))
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityConfig": config})
}

func (s *protectedStoreServer) handleUpsertCapacityConfig(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ZoneID              string  `json:"zoneId"`
		MaxConcurrentOrders int     `json:"maxConcurrentOrders"`
		MaxCaptainsOnline   int     `json:"maxCaptainsOnline"`
		ThrottleThreshold   float64 `json:"throttleThreshold"`
		ExpectedVersion     int     `json:"expectedVersion"`
		Reason              string  `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	config, err := platformpolicies.UpsertCapacity(r.Context(), s.db, platformpolicies.UpsertCapacityInput{
		ZoneID: body.ZoneID, MaxConcurrentOrders: body.MaxConcurrentOrders,
		MaxCaptainsOnline: body.MaxCaptainsOnline, ThrottleThreshold: body.ThrottleThreshold,
		ExpectedVersion: body.ExpectedVersion,
	}, mutation)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityConfig": config})
}

func (s *protectedStoreServer) handleGetZoneServiceability(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	result, err := platformpolicies.GetZoneServiceability(r.Context(), s.db, r.PathValue("zoneId"))
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}

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

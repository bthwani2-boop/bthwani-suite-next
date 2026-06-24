package http

import (
	"errors"
	"net/http"
	"strconv"

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

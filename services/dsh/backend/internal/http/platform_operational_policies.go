package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

func writePlatformPolicyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, platformpolicies.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_PLATFORM_POLICY", "platform policy input is invalid")
	case errors.Is(err, platformpolicies.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "PLATFORM_POLICY_NOT_FOUND", "platform policy record was not found")
	case errors.Is(err, platformpolicies.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "platform policy changed; reload before retrying")
	case errors.Is(err, platformpolicies.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different platform policy request")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "platform policy operation failed")
	}
}

func platformPolicyMutation(w http.ResponseWriter, r *http.Request, actorID string, reason string) (platformpolicies.MutationContext, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	reason = strings.TrimSpace(reason)
	if len(idempotencyKey) < 8 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
		return platformpolicies.MutationContext{}, false
	}
	if len(correlationID) < 8 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID must contain at least 8 characters")
		return platformpolicies.MutationContext{}, false
	}
	if len(reason) < 3 {
		store.SendError(w, http.StatusBadRequest, "REASON_REQUIRED", "a reason is required for platform policy changes")
		return platformpolicies.MutationContext{}, false
	}
	return platformpolicies.MutationContext{
		ActorID: actorID, ActorSurface: "control-panel", IdempotencyKey: idempotencyKey,
		CorrelationID: correlationID, Reason: reason,
	}, true
}

func (s *protectedStoreServer) handleListPlatformZones(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", "platform.read", "operator"); !ok { return }
	includeInactive := true
	if raw := strings.TrimSpace(r.URL.Query().Get("includeInactive")); raw != "" {
		parsed, err := strconv.ParseBool(raw)
		if err != nil { store.SendError(w, http.StatusBadRequest, "INVALID_QUERY", "includeInactive must be boolean"); return }
		includeInactive = parsed
	}
	items, err := platformpolicies.ListZones(r.Context(), s.db, includeInactive)
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"zones": items})
}

func (s *protectedStoreServer) handleCreatePlatformZone(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage", "operator"); if !ok { return }
	var body struct {
		ID string `json:"id"`; Name string `json:"name"`; CityCode string `json:"cityCode"`; Description string `json:"description"`; Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) { return }
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason); if !ok { return }
	item, err := platformpolicies.CreateZone(r.Context(), s.db, platformpolicies.CreateZoneInput{ID: body.ID, Name: body.Name, CityCode: body.CityCode, Description: body.Description}, mutation)
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusCreated, map[string]any{"zone": item})
}

func (s *protectedStoreServer) handleUpdatePlatformZone(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage", "operator"); if !ok { return }
	var body struct {
		Name *string `json:"name"`; Description *string `json:"description"`; IsActive *bool `json:"isActive"`; ExpectedVersion int `json:"expectedVersion"`; Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) { return }
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason); if !ok { return }
	item, err := platformpolicies.UpdateZone(r.Context(), s.db, r.PathValue("zoneId"), platformpolicies.UpdateZoneInput{Name: body.Name, Description: body.Description, IsActive: body.IsActive, ExpectedVersion: body.ExpectedVersion}, mutation)
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"zone": item})
}

func (s *protectedStoreServer) handleListPlatformSlaRules(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", "platform.read", "operator"); !ok { return }
	items, err := platformpolicies.ListSlaRules(r.Context(), s.db, r.URL.Query().Get("zoneId"))
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"slaRules": items})
}

func (s *protectedStoreServer) handleUpsertPlatformSlaRule(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage", "operator"); if !ok { return }
	var body struct { ZoneID string `json:"zoneId"`; Category string `json:"category"`; MaxPrepMins int `json:"maxPrepMins"`; MaxDeliveryMins int `json:"maxDeliveryMins"`; ExpectedVersion int `json:"expectedVersion"`; Reason string `json:"reason"` }
	if !decodeProtectedJSON(w, r, &body) { return }
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason); if !ok { return }
	item, err := platformpolicies.UpsertSlaRule(r.Context(), s.db, platformpolicies.UpsertSlaInput{ZoneID: body.ZoneID, Category: body.Category, MaxPrepMins: body.MaxPrepMins, MaxDeliveryMins: body.MaxDeliveryMins, ExpectedVersion: body.ExpectedVersion}, mutation)
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"slaRule": item})
}

func (s *protectedStoreServer) handleGetPlatformCapacity(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", "platform.read", "operator"); !ok { return }
	item, err := platformpolicies.GetCapacity(r.Context(), s.db, r.URL.Query().Get("zoneId"))
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityConfig": item})
}

func (s *protectedStoreServer) handleUpsertPlatformCapacity(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage", "operator"); if !ok { return }
	var body struct { ZoneID string `json:"zoneId"`; MaxConcurrentOrders int `json:"maxConcurrentOrders"`; MaxCaptainsOnline int `json:"maxCaptainsOnline"`; ThrottleThreshold float64 `json:"throttleThreshold"`; ExpectedVersion int `json:"expectedVersion"`; Reason string `json:"reason"` }
	if !decodeProtectedJSON(w, r, &body) { return }
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason); if !ok { return }
	item, err := platformpolicies.UpsertCapacity(r.Context(), s.db, platformpolicies.UpsertCapacityInput{ZoneID: body.ZoneID, MaxConcurrentOrders: body.MaxConcurrentOrders, MaxCaptainsOnline: body.MaxCaptainsOnline, ThrottleThreshold: body.ThrottleThreshold, ExpectedVersion: body.ExpectedVersion}, mutation)
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityConfig": item})
}

func (s *protectedStoreServer) handleGetPlatformZoneServiceability(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", "platform.read", "operator"); !ok { return }
	item, err := platformpolicies.GetZoneServiceability(r.Context(), s.db, r.PathValue("zoneId"))
	if err != nil { writePlatformPolicyError(w, err); return }
	store.SendJSON(w, http.StatusOK, item)
}

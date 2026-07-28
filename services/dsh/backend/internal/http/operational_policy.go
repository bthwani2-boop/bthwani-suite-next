package http

import (
	"net/http"
	"strconv"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGetOperationalProfile(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	profile, err := platformpolicies.GetOperationalProfile(
		r.Context(),
		s.db,
		r.PathValue("zoneId"),
		r.URL.Query().Get("category"),
	)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"profile": profile})
}

func (s *protectedStoreServer) handleUpsertOperationalProfile(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		SlaCategory             string  `json:"slaCategory"`
		MaxPrepMins             int     `json:"maxPrepMins"`
		MaxAssignmentMins       int     `json:"maxAssignmentMins"`
		MaxDeliveryMins         int     `json:"maxDeliveryMins"`
		ExpectedSlaVersion      int     `json:"expectedSlaVersion"`
		MaxConcurrentOrders     int     `json:"maxConcurrentOrders"`
		MaxCaptainsOnline       int     `json:"maxCaptainsOnline"`
		ThrottleThreshold       float64 `json:"throttleThreshold"`
		IsPaused                bool    `json:"isPaused"`
		PauseReason             string  `json:"pauseReason"`
		ExpectedCapacityVersion int     `json:"expectedCapacityVersion"`
		Reason                  string  `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	profile, err := platformpolicies.UpsertOperationalProfile(
		r.Context(),
		s.db,
		platformpolicies.UpsertOperationalProfileInput{
			ZoneID:                  r.PathValue("zoneId"),
			SlaCategory:             body.SlaCategory,
			MaxPrepMins:             body.MaxPrepMins,
			MaxAssignmentMins:       body.MaxAssignmentMins,
			MaxDeliveryMins:         body.MaxDeliveryMins,
			ExpectedSlaVersion:      body.ExpectedSlaVersion,
			MaxConcurrentOrders:     body.MaxConcurrentOrders,
			MaxCaptainsOnline:       body.MaxCaptainsOnline,
			ThrottleThreshold:       body.ThrottleThreshold,
			IsPaused:                body.IsPaused,
			PauseReason:             body.PauseReason,
			ExpectedCapacityVersion: body.ExpectedCapacityVersion,
		},
		mutation,
	)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"profile": profile})
}

func (s *protectedStoreServer) handleListOperationalDeliveryModes(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	items, err := platformpolicies.ListDeliveryModePolicies(r.Context(), s.db, r.PathValue("zoneId"))
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"deliveryModes": items})
}

func (s *protectedStoreServer) handleUpsertOperationalDeliveryMode(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		IsEnabled       bool   `json:"isEnabled"`
		SlaCategory     string `json:"slaCategory"`
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
	item, err := platformpolicies.UpsertDeliveryModePolicy(
		r.Context(),
		s.db,
		platformpolicies.UpsertDeliveryModePolicyInput{
			ZoneID:          r.PathValue("zoneId"),
			FulfillmentMode: r.PathValue("fulfillmentMode"),
			IsEnabled:       body.IsEnabled,
			SlaCategory:     body.SlaCategory,
			ExpectedVersion: body.ExpectedVersion,
		},
		mutation,
	)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"deliveryMode": item})
}

func (s *protectedStoreServer) handleEvaluateOperationalPolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "client", "partner", "captain", "operator"); !ok {
		return
	}
	var body platformpolicies.OperationalEvaluationInput
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	decision, err := platformpolicies.EvaluateOperationalPolicy(r.Context(), s.db, body)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"decision": decision})
}

func (s *protectedStoreServer) handleListOperationalPolicyAudit(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionRead, "operator"); !ok {
		return
	}
	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 200 {
			store.SendError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be between 1 and 200")
			return
		}
		limit = parsed
	}
	items, err := platformpolicies.ListPolicyAuditEvents(
		r.Context(),
		s.db,
		r.URL.Query().Get("aggregateType"),
		r.URL.Query().Get("aggregateId"),
		limit,
	)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": items})
}

func (s *protectedStoreServer) handleRollbackOperationalPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PlatformPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ExpectedCurrentVersion int    `json:"expectedCurrentVersion"`
		Reason                 string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	mutation, ok := platformPolicyMutation(w, r, actor.ID, body.Reason)
	if !ok {
		return
	}
	result, err := platformpolicies.RollbackPolicyEvent(
		r.Context(),
		s.db,
		platformpolicies.RollbackPolicyInput{
			EventID:                r.PathValue("eventId"),
			ExpectedCurrentVersion: body.ExpectedCurrentVersion,
		},
		mutation,
	)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"rollback": result})
}

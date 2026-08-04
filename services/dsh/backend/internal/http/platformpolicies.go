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
	DshServiceZonesPermissionRead              = "dsh.service_zones.read"
	DshServiceZonesPermissionManage            = "dsh.service_zones.manage"
	DshFulfillmentSlaPermissionRead             = "dsh.fulfillment_sla.read"
	DshFulfillmentSlaPermissionManage           = "dsh.fulfillment_sla.manage"
	DshDispatchCapacityPermissionRead           = "dsh.dispatch_capacity.read"
	DshDispatchCapacityPermissionManage         = "dsh.dispatch_capacity.manage"
	DshDispatchFinancialEligibilityPermissionRead   = "dsh.dispatch_financial_eligibility.read"
	DshDispatchFinancialEligibilityPermissionManage = "dsh.dispatch_financial_eligibility.manage"
	DshOperationalPolicyAuditPermissionRead     = "dsh.operational_policy.audit.read"
	DshOperationalPolicyRollbackPermission      = "dsh.operational_policy.rollback"
	DshPlatformManagePermission                 = "dsh.platform.manage"
)

func (s *protectedStoreServer) handleListZones(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.ActorFromContext(r.Context()); !ok {
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
	actor, ok := s.ActorFromContext(r.Context())
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
	actor, ok := s.ActorFromContext(r.Context())
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
	if _, ok := s.ActorFromContext(r.Context()); !ok {
		return
	}
	rules, err := platformpolicies.ListSlaRules(r.Context(), s.db, r.URL.Query().Get("zoneId"))
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"slaRules": rules})
}

func (s *protectedStoreServer) handleCreateDraftChangeSet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	var body platformpolicies.DraftChangeSetInput
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	cs, err := platformpolicies.CreateDraftChangeSet(r.Context(), s.db, body, actor.ID)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"changeSet": cs})
}

func (s *protectedStoreServer) handleSubmitChangeSet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	changeSetID := r.PathValue("changeSetId")
	cs, err := platformpolicies.SubmitForReview(r.Context(), s.db, changeSetID, actor.ID)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"changeSet": cs})
}

func (s *protectedStoreServer) handleApproveChangeSet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	changeSetID := r.PathValue("changeSetId")
	cs, err := platformpolicies.ApproveChangeSet(r.Context(), s.db, changeSetID, actor.ID)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"changeSet": cs})
}

func (s *protectedStoreServer) handleApplyChangeSet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	changeSetID := r.PathValue("changeSetId")
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}
	defer tx.Rollback()
	err = platformpolicies.MarkApplied(r.Context(), tx, changeSetID, actor.ID)
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	if err := tx.Commit(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"status": "applied"})
}


func (s *protectedStoreServer) handleGetZoneServiceability(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.ActorFromContext(r.Context()); !ok {
		return
	}
	result, err := platformpolicies.GetZoneServiceability(r.Context(), s.db, r.PathValue("zoneId"))
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}


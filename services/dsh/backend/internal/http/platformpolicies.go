package http

import (
	"net/http"
	"strconv"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

const (
	DshServiceZonesPermissionRead                   = "dsh.service_zones.read"
	DshServiceZonesPermissionManage                 = "dsh.service_zones.manage"
	DshFulfillmentSlaPermissionRead                 = "dsh.fulfillment_sla.read"
	DshFulfillmentSlaPermissionManage               = "dsh.fulfillment_sla.manage"
	DshDispatchCapacityPermissionRead               = "dsh.dispatch_capacity.read"
	DshDispatchCapacityPermissionManage             = "dsh.dispatch_capacity.manage"
	DshDispatchFinancialEligibilityPermissionRead   = "dsh.dispatch_financial_eligibility.read"
	DshDispatchFinancialEligibilityPermissionManage = "dsh.dispatch_financial_eligibility.manage"
	DshOperationalPolicyAuditPermissionRead         = "dsh.operational_policy.audit.read"
	DshOperationalPolicyRollbackPermission          = "dsh.operational_policy.rollback"
	DshPlatformManagePermission                     = "dsh.platform.manage"
)

// Sovereign operational policy reads.
//
// Zone, SLA and capacity mutations are no longer served here: a direct write
// path alongside the change-set workflow is a second policy authority, and
// J015 requires exactly one effective version behind draft/review/approval.
// Mutations go through the change-set routes in platform_changesets_routes.go.

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

func (s *protectedStoreServer) handleGetCapacityConfig(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.ActorFromContext(r.Context()); !ok {
		return
	}
	config, err := platformpolicies.GetCapacity(r.Context(), s.db, r.URL.Query().Get("zoneId"))
	if err != nil {
		writePlatformPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityConfig": config})
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

package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

// Compatibility ownership for the pre-profile operational-policy routes.
//
// canonical_operation: platformpolicies.go handlers
// legacy_operation: handle*Platform* route bindings in catalog_unified_routes.go
// write_path: FORWARDED_TO_CANONICAL
// owner: services/dsh
// live_consumers: control-panel operational policy screens
// expiry: after all consumers use the operational-profile routes
// removal_trigger: zero telemetry on legacy route patterns for one release
// telemetry: HTTP route metrics emitted by the shared DSH server middleware
//
// These wrappers must never decode input, authorize independently, or write to
// the database. They exist only to forward established URLs to one canonical
// handler implementation while consumers migrate.
func (s *protectedStoreServer) handleListPlatformZones(w http.ResponseWriter, r *http.Request) {
	s.handleListZones(w, r)
}

func (s *protectedStoreServer) handleCreatePlatformZone(w http.ResponseWriter, r *http.Request) {
	s.handleCreateZone(w, r)
}

func (s *protectedStoreServer) handleUpdatePlatformZone(w http.ResponseWriter, r *http.Request) {
	s.handleUpdateZone(w, r)
}

func (s *protectedStoreServer) handleListPlatformSlaRules(w http.ResponseWriter, r *http.Request) {
	s.handleListSlaRules(w, r)
}

func (s *protectedStoreServer) handleUpsertPlatformSlaRule(w http.ResponseWriter, r *http.Request) {
	s.handleUpsertSlaRules(w, r)
}

func (s *protectedStoreServer) handleGetPlatformCapacity(w http.ResponseWriter, r *http.Request) {
	s.handleGetCapacityConfig(w, r)
}

func (s *protectedStoreServer) handleUpsertPlatformCapacity(w http.ResponseWriter, r *http.Request) {
	s.handleUpsertCapacityConfig(w, r)
}

func (s *protectedStoreServer) handleGetPlatformZoneServiceability(w http.ResponseWriter, r *http.Request) {
	s.handleGetZoneServiceability(w, r)
}

func writePlatformPolicyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, platformpolicies.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_PLATFORM_POLICY", "operational policy input is invalid")
	case errors.Is(err, platformpolicies.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "PLATFORM_POLICY_NOT_FOUND", "operational policy record was not found")
	case errors.Is(err, platformpolicies.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "operational policy changed; reload before retrying")
	case errors.Is(err, platformpolicies.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different operational policy request")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "operational policy operation failed")
	}
}

func platformPolicyMutation(
	w http.ResponseWriter,
	r *http.Request,
	actorID string,
	reason string,
) (platformpolicies.MutationContext, bool) {
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
	if len(reason) < 3 || len(reason) > 500 {
		store.SendError(w, http.StatusBadRequest, "REASON_REQUIRED", "a reason between 3 and 500 characters is required")
		return platformpolicies.MutationContext{}, false
	}
	return platformpolicies.MutationContext{
		ActorID:        actorID,
		ActorSurface:   "control-panel",
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		Reason:         reason,
	}, true
}

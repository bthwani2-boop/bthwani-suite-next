package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) handleGetCaptainAvailability(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	availability, err := dispatch.GetCaptainAvailability(s.db, operatorContextID, actor.ID)
	if err != nil {
		writeCaptainAvailabilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, availability)
}

func (s *protectedStoreServer) handleSetCaptainAvailability(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	var body struct {
		Status          string `json:"status"`
		ExpectedVersion int    `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	availability, err := dispatch.SetCaptainAvailability(
		s.db, operatorContextID, actor.ID, actor.ID, body.Status, body.ExpectedVersion,
	)
	if err != nil {
		writeCaptainAvailabilityError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, availability)
}

func writeCaptainAvailabilityError(w http.ResponseWriter, err error) {
	switch {
	case strings.Contains(err.Error(), "captain profile not found"):
		store.SendError(w, http.StatusConflict, "CAPTAIN_PROFILE_REQUIRED", "Captain dispatch profile is not provisioned")
	case strings.Contains(err.Error(), "version changed"):
		store.SendError(w, http.StatusConflict, "STALE_VERSION", "Captain availability changed; refresh and retry")
	case strings.Contains(err.Error(), "unavailability notice"):
		store.SendError(w, http.StatusConflict, "CAPTAIN_UNAVAILABLE_BY_WORKFORCE_NOTICE", "Workforce currently blocks Captain availability")
	case strings.Contains(err.Error(), "required") || strings.Contains(err.Error(), "may only"):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Captain availability operation failed")
	}
}

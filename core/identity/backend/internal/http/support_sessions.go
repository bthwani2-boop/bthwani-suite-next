package http

import (
	"errors"
	"net/http"

	"identity-api/internal/identity"
)

// internalSupportSessionsIssue issues a new elevated, time-limited support
// session. The caller (DSH) is responsible for its own maker-checker
// approval before calling this; Identity enforces only the invariants that
// must never depend on a remote caller's correctness: no self-target, and
// both actors must exist and be ACTIVE.
func (s *server) internalSupportSessionsIssue(w http.ResponseWriter, r *http.Request) {
	var request struct {
		SupportRequestID string `json:"supportRequestId"`
		TargetActorID    string `json:"targetActorId"`
		InitiatorActorID string `json:"initiatorActorId"`
		Reason           string `json:"reason"`
		DurationMinutes  int    `json:"durationMinutes"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	token, err := s.repository.IssueSupportSession(
		r.Context(), request.SupportRequestID, request.TargetActorID,
		request.InitiatorActorID, request.Reason, request.DurationMinutes,
	)
	if err != nil {
		writeSupportSessionError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, token)
}

// internalSupportSessionsResolve resolves a support access token to its
// identity. It never falls back to standard session resolution.
func (s *server) internalSupportSessionsResolve(w http.ResponseWriter, r *http.Request) {
	var request struct {
		AccessToken string `json:"accessToken"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	resolved, err := s.repository.ResolveSupportSession(r.Context(), request.AccessToken)
	if err != nil {
		writeSupportSessionError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, resolved)
}

// internalSupportSessionsRevoke revokes the support session issued for the
// given request id.
func (s *server) internalSupportSessionsRevoke(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Reason string `json:"reason"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	requestID := r.PathValue("requestId")
	if err := s.repository.RevokeSupportSession(r.Context(), requestID, request.Reason); err != nil {
		writeSupportSessionError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"revoked": true})
}

func writeSupportSessionError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, identity.ErrSupportSessionAlreadyIssued):
		sendError(w, http.StatusConflict, "SUPPORT_SESSION_ALREADY_ISSUED", err.Error())
	case errors.Is(err, identity.ErrSupportSessionRequestConflict):
		sendError(w, http.StatusConflict, "SUPPORT_SESSION_REQUEST_CONFLICT", err.Error())
	case errors.Is(err, identity.ErrSupportSessionSelfTarget):
		sendError(w, http.StatusBadRequest, "SUPPORT_SESSION_SELF_TARGET", err.Error())
	case errors.Is(err, identity.ErrSupportSessionTargetUnavailable):
		sendError(w, http.StatusBadRequest, "SUPPORT_SESSION_TARGET_UNAVAILABLE", err.Error())
	case errors.Is(err, identity.ErrSupportSessionNotFound):
		sendError(w, http.StatusNotFound, "SUPPORT_SESSION_NOT_FOUND", err.Error())
	case errors.Is(err, identity.ErrUnauthenticated):
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "support session is invalid or expired")
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "support session request failed")
	}
}

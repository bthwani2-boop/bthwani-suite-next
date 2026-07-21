package http

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"bthwani/identity/backend/internal/identity"
)

// RegisterSupportSessionRoutes exposes service-only support-session lifecycle
// endpoints. DSH owns approval; Identity alone issues and resolves tokens.
func RegisterSupportSessionRoutes(
	router *http.ServeMux,
	repository *identity.Repository,
	dshServiceToken string,
	supportTokenSecret string,
) {
	dshServiceToken = strings.TrimSpace(dshServiceToken)
	supportTokenSecret = strings.TrimSpace(supportTokenSecret)
	onlyDsh := func(handler http.HandlerFunc) http.Handler {
		return serviceOnlyCallers(map[string]string{"dsh": dshServiceToken}, handler)
	}
	router.Handle("POST /internal/support-sessions", onlyDsh(issueSupportSession(repository, supportTokenSecret)))
	router.Handle("POST /internal/support-sessions/resolve", onlyDsh(resolveSupportSession(repository)))
	router.Handle("POST /internal/support-sessions/{requestId}/revoke", onlyDsh(revokeSupportSession(repository)))
}

func writeSupportSessionError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, identity.ErrSupportSessionInvalid):
		writeJSON(w, http.StatusBadRequest, apiError{Code: "SUPPORT_SESSION_INVALID", Message: "support session request is invalid"})
	case errors.Is(err, identity.ErrSupportSessionForbidden):
		writeJSON(w, http.StatusForbidden, apiError{Code: "SUPPORT_SESSION_FORBIDDEN", Message: "support session actors are not eligible"})
	case errors.Is(err, identity.ErrSupportSessionConflict):
		writeJSON(w, http.StatusConflict, apiError{Code: "SUPPORT_SESSION_CONFLICT", Message: "support session request conflicts with existing state"})
	case errors.Is(err, identity.ErrSessionInvalid):
		writeJSON(w, http.StatusUnauthorized, apiError{Code: "SUPPORT_SESSION_INVALID_TOKEN", Message: "support session token is invalid or expired"})
	default:
		writeJSON(w, http.StatusInternalServerError, apiError{Code: "SUPPORT_SESSION_INTERNAL", Message: "support session action failed"})
	}
}

func issueSupportSession(repository *identity.Repository, tokenSecret string) http.HandlerFunc {
	type request struct {
		SupportRequestID string `json:"supportRequestId"`
		TargetActorID    string `json:"targetActorId"`
		InitiatorActorID string `json:"initiatorActorId"`
		Reason           string `json:"reason"`
		DurationMinutes  int    `json:"durationMinutes"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body request
		if err := decodeJSON(r, &body); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "invalid support session request"})
			return
		}
		token, err := repository.IssueSupportSession(r.Context(), identity.SupportSessionInput{
			SupportRequestID: body.SupportRequestID,
			TargetActorID:    body.TargetActorID,
			InitiatorActorID: body.InitiatorActorID,
			Reason:           body.Reason,
			Duration:         time.Duration(body.DurationMinutes) * time.Minute,
		}, tokenSecret)
		if err != nil {
			writeSupportSessionError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, token)
	}
}

func resolveSupportSession(repository *identity.Repository) http.HandlerFunc {
	type request struct {
		AccessToken string `json:"accessToken"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body request
		if err := decodeJSON(r, &body); err != nil || strings.TrimSpace(body.AccessToken) == "" {
			writeJSON(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "accessToken is required"})
			return
		}
		actorIdentity, err := repository.ResolveAccessTokenDetailed(r.Context(), body.AccessToken)
		if err != nil || actorIdentity.SessionKind != "support" {
			if err == nil {
				err = identity.ErrSessionInvalid
			}
			writeSupportSessionError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, actorIdentity)
	}
}

func revokeSupportSession(repository *identity.Repository) http.HandlerFunc {
	type request struct {
		Reason string `json:"reason"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body request
		if err := decodeJSON(r, &body); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "revocation reason is required"})
			return
		}
		if err := repository.RevokeSupportSession(r.Context(), r.PathValue("requestId"), body.Reason); err != nil {
			writeSupportSessionError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"revoked": true})
	}
}

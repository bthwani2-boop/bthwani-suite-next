package http

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"os"
	"strings"

	"identity-api/internal/identity"
)

type partnerAccessServer struct {
	repository *identity.Repository
}

func RegisterPartnerAccessRoutes(handler http.Handler, repository *identity.Repository) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("identity partner access routes require *http.ServeMux")
	}
	s := &partnerAccessServer{repository: repository}
	mux.HandleFunc("GET /internal/partner/permission-bundles", s.dshOnly(s.permissionBundles))
	mux.HandleFunc("POST /internal/partner/actors/provision", s.dshOnly(s.provisionActor))
	mux.HandleFunc("POST /internal/partner/actors/{actorId}/activations", s.dshOnly(s.issueActivation))
}

func (s *partnerAccessServer) dshOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "dsh" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
			return
		}
		expectedToken := strings.TrimSpace(os.Getenv("IDENTITY_DSH_SERVICE_TOKEN"))
		if expectedToken == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "DSH internal API is not configured")
			return
		}
		token, ok := bearerToken(r)
		if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "DSH service token is required")
			return
		}
		operatorContextID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))
		if operatorContextID == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "trusted operator context is not configured")
			return
		}
		requestedOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
		if requestedOperatorContextID == "" {
			sendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "X-Operator-Context-ID is required")
			return
		}
		if subtle.ConstantTimeCompare([]byte(requestedOperatorContextID), []byte(operatorContextID)) != 1 {
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "service operator context does not match the active runtime context")
			return
		}
		next(w, r)
	}
}

func (s *partnerAccessServer) permissionBundles(w http.ResponseWriter, _ *http.Request) {
	sendJSON(w, http.StatusOK, map[string]any{"permissionBundles": identity.PartnerPermissionBundles()})
}

func (s *partnerAccessServer) provisionActor(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Username         string `json:"username"`
		PhoneE164        string `json:"phoneE164"`
		PermissionBundle string `json:"permissionBundle"`
		StoreID          string `json:"storeId"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	view, err := s.repository.ProvisionPartnerActor(r.Context(), identity.PartnerActorProvisionInput{
		Username:          request.Username,
		PhoneE164:         request.PhoneE164,
		PermissionBundle:  request.PermissionBundle,
		StoreID:           request.StoreID,
		OperatorContextID: strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")),
	})
	if err != nil {
		writePartnerAccessError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, view)
}

func (s *partnerAccessServer) issueActivation(w http.ResponseWriter, r *http.Request) {
	var request struct {
		IssuedByActorID string `json:"issuedByActorId"`
		StoreID         string `json:"storeId"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	result, err := s.repository.IssuePartnerActivationForActor(
		r.Context(),
		r.PathValue("actorId"),
		identity.PartnerActivationInput{
			IssuedByActorID:   request.IssuedByActorID,
			StoreID:           request.StoreID,
			OperatorContextID: strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")),
		},
		r.Header.Get("Idempotency-Key"),
		r.Header.Get("X-Correlation-ID"),
	)
	if err != nil {
		writePartnerAccessError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, result)
}

func writePartnerAccessError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, identity.ErrInvalidActivation):
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partner actor request is invalid")
	case errors.Is(err, identity.ErrForbidden):
		sendError(w, http.StatusForbidden, "FORBIDDEN", "partner actor scope is forbidden")
	case errors.Is(err, identity.ErrPhoneAlreadyBound), errors.Is(err, identity.ErrUsernameTaken):
		sendError(w, http.StatusConflict, "IDENTITY_CONFLICT", "phone or username is already bound")
	case errors.Is(err, identity.ErrActorNotFound):
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "partner actor was not found")
	case errors.Is(err, identity.ErrActivationRateLimited):
		sendError(w, http.StatusTooManyRequests, "RATE_LIMITED", "activation issuance is rate limited")
	case errors.Is(err, identity.ErrActivationUnavailable):
		sendError(w, http.StatusServiceUnavailable, "ACTIVATION_UNAVAILABLE", "activation issuance is unavailable")
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
	}
}

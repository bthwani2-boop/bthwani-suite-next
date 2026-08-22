package http

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
)

func (s *server) verifyAssignmentActorContext(ctx context.Context, actorID, operatorContextID, role string) (context.Context, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	role = strings.TrimSpace(role)
	if s.identity == nil || !s.identity.Configured() {
		return nil, identityclient.ErrUnavailable
	}
	if err := s.identity.VerifyActorRoleInOperatorContext(ctx, actorID, operatorContextID, role); err != nil {
		return nil, err
	}
	return auth.WithOperatorContext(ctx, operatorContextID), nil
}

func writeAssignmentIdentityError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, identityclient.ErrOperatorContextForbidden):
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "actor is outside the verified operator context")
	case errors.Is(err, identityclient.ErrUnavailable):
		sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity context authority is unavailable")
	default:
		sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity context authority could not verify the actor")
	}
}

func (s *server) handleGetActorScopes(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	role := r.URL.Query().Get("role")
	operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))

	if actorID == "" || role == "" || operatorContextID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorId, role, and trusted operator context are required")
		return
	}

	trustedContext, err := s.verifyAssignmentActorContext(r.Context(), actorID, operatorContextID, role)
	if err != nil {
		writeAssignmentIdentityError(w, err)
		return
	}

	scopes, err := s.repo.GetOperationalScopes(trustedContext, actorID, operatorContextID, role)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, scopes)
}

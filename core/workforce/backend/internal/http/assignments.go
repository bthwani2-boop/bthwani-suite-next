package http

import (
	"net/http"
	"strings"

	"workforce-api/internal/workforce"
)

type SetScopesRequest struct {
	Role   string                                 `json:"role"`
	Inputs []workforce.OperationalAssignmentInput `json:"inputs"`
}

func (s *server) handleGetActorScopes(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	role := r.URL.Query().Get("role")
	operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))

	if actorID == "" || role == "" || operatorContextID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorId, role, and trusted operator context are required")
		return
	}

	scopes, err := s.repo.GetOperationalScopes(r.Context(), actorID, operatorContextID, role)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, scopes)
}

func (s *server) handleSetActorScopes(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorId is required")
		return
	}

	var req SetScopesRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	changedBy := strings.TrimSpace(r.Header.Get("X-Actor-ID"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if operatorContextID == "" || changedBy == "" || correlationID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "trusted operator context, actor, and correlation headers are required")
		return
	}

	scopes, err := s.repo.SetOperationalScopes(r.Context(), actorID, operatorContextID, req.Role, req.Inputs, changedBy, correlationID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, scopes)
}

package http

import (
	"encoding/json"
	"log"
	"net/http"

	"bthwani.com/core/workforce/backend/internal/workforce"
)


type SetScopesRequest struct {
	Role              string                               `json:"role"`
	OperatorContextID string                               `json:"operatorContextId"`
	Inputs            []workforce.OperationalAssignmentInput `json:"inputs"`
}

func (s *Server) handleGetActorScopes(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	role := r.URL.Query().Get("role")
	operatorContextID := r.URL.Query().Get("operatorContextId")

	if actorID == "" || role == "" || operatorContextID == "" {
		http.Error(w, `{"error":"actorId, role, and operatorContextId are required"}`, http.StatusBadRequest)
		return
	}

	scopes, err := s.repo.GetOperationalScopes(r.Context(), actorID, operatorContextID, role)
	if err != nil {
		log.Printf("Failed to get actor scopes: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(scopes)
}

func (s *Server) handleSetActorScopes(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	if actorID == "" {
		http.Error(w, `{"error":"actorId is required"}`, http.StatusBadRequest)
		return
	}

	var req SetScopesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	changedBy := r.Header.Get("X-Operator-ID")

	scopes, err := s.repo.SetOperationalScopes(r.Context(), actorID, req.OperatorContextID, req.Role, req.Inputs, changedBy)
	if err != nil {
		log.Printf("Failed to set actor scopes: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(scopes)
}

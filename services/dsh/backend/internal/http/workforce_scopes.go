package http

import (
	"encoding/json"
	"net/http"
	"os"

	"dsh-api/internal/workforceclient"
)

type workforceScopesServer struct {
	workforce *workforceclient.Client
}

func RegisterWorkforceScopesRoutes(mux *http.ServeMux) {
	s := &workforceScopesServer{
		workforce: workforceclient.NewClient(os.Getenv("DSH_WORKFORCE_BASE_URL"), os.Getenv("WORKFORCE_DSH_SERVICE_TOKEN")),
	}

	// DSH exposes Workforce scopes as a read-through operational reference only.
	// Workforce remains the sole owner of assignment/scope mutations.
	mux.HandleFunc("GET /dsh/operator/workforce/scopes/{actorId}", s.handleGetOperatorWorkforceScopes)
}

func (s *workforceScopesServer) handleGetOperatorWorkforceScopes(w http.ResponseWriter, r *http.Request) {
	actorID := r.PathValue("actorId")
	role := r.URL.Query().Get("role")
	operatorContextID := r.URL.Query().Get("operatorContextId")

	scopes, err := s.workforce.GetActorScopes(r.Context(), actorID, operatorContextID, role)
	if err != nil {
		http.Error(w, `{"error":"failed to get scopes"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(scopes)
}

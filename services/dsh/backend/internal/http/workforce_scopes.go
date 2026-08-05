package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// RegisterWorkforceScopesRoutes exposes Workforce scopes as a read-through
// operational reference only. Workforce remains the sole owner of
// assignment/scope mutations.
//
// This was previously served by a standalone, unauthenticated server type
// that took operatorContextId from the client query string -- a
// cross-OperatorContext IDOR, not merely a missing check. It is now a
// protectedStoreServer handler so it shares the one Identity-backed
// authorization boundary the rest of DSH uses, and derives OperatorContext
// from the trusted session rather than accepting it as a client-supplied
// parameter.
func RegisterWorkforceScopesRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	s := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/workforce/scopes/{actorId}", s.withPermission("control-panel", OperationsPermissionRead, s.handleGetOperatorWorkforceScopes))
}

func (s *protectedStoreServer) handleGetOperatorWorkforceScopes(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	role := r.URL.Query().Get("actorRole")
	scopes, err := s.workforce.GetActorScopes(r.Context(), r.PathValue("actorId"), actor.OperatorContextID, role)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get scopes")
		return
	}
	store.SendJSON(w, http.StatusOK, scopes)
}

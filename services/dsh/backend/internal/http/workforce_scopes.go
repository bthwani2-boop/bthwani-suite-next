package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
	"dsh-api/internal/workforceclient"
)

type publicWorkforceScopeSnapshot struct {
	ActorID          string   `json:"actorId"`
	ActorRole        string   `json:"actorRole"`
	StoreIDs         []string `json:"storeIds"`
	ServiceAreaCodes []string `json:"serviceAreaCodes"`
}

func publicWorkforceScopeSnapshotFromInternal(scopes *workforceclient.ActorScopes) publicWorkforceScopeSnapshot {
	if scopes == nil {
		return publicWorkforceScopeSnapshot{StoreIDs: []string{}, ServiceAreaCodes: []string{}}
	}
	storeIDs := append([]string(nil), scopes.StoreIDs...)
	if storeIDs == nil {
		storeIDs = []string{}
	}
	serviceAreaCodes := append([]string(nil), scopes.ServiceAreaCodes...)
	if serviceAreaCodes == nil {
		serviceAreaCodes = []string{}
	}
	return publicWorkforceScopeSnapshot{
		ActorID:          scopes.ActorID,
		ActorRole:        scopes.Role,
		StoreIDs:         storeIDs,
		ServiceAreaCodes: serviceAreaCodes,
	}
}

// RegisterWorkforceScopesRoutes exposes Workforce scopes as a read-through
// operational reference only. Workforce remains the sole owner of Workforce
// operational-assignment mutations; DSH remains the sole owner of store-access
// authorization. This route mutates neither authority.
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
	if role != "field" && role != "captain" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorRole must be field or captain")
		return
	}
	scopes, err := s.workforce.GetActorScopes(r.Context(), r.PathValue("actorId"), actor.OperatorContextID, role)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WORKFORCE_UNAVAILABLE", "workforce scope authority is unavailable")
		return
	}
	store.SendJSON(w, http.StatusOK, publicWorkforceScopeSnapshotFromInternal(scopes))
}

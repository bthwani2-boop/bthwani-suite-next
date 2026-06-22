package http

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/store"
)

type protectedStoreServer struct {
	db       *sql.DB
	identity *auth.Client
}

func newProtectedStoreServer(db *sql.DB, identity *auth.Client) *protectedStoreServer {
	return &protectedStoreServer{db: db, identity: identity}
}

func (s *protectedStoreServer) handleStoreContext(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "field", "captain", "operator")
	if !ok {
		return
	}
	row, scope, err := store.ResolveActorStore(r.Context(), s.db, actor)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	events, _ := store.ListStoreAudit(r.Context(), s.db, row.ID, 1)
	var latest any
	if len(events) > 0 {
		latest = events[0]
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"actorRole":    actor.Role,
		"scope":        scope.Type,
		"store":        store.RowToDetail(*row),
		"latestAction": latest,
	})
}

func (s *protectedStoreServer) handleOperatorStores(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	result, err := store.ListAllStores(s.db, store.DshStoreListQuery{Limit: 100, Offset: 0})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load stores")
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}

func (s *protectedStoreServer) handleOperatorStoreDetail(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	row, err := store.GetStoreByIDInternal(r.Context(), s.db, r.PathValue("storeId"))
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"store": store.RowToDetail(*row)})
}

func (s *protectedStoreServer) handlePartnerSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	var input store.PartnerSettingsInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.UpdatePartnerSettings(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleFieldVerification(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	var input store.FieldVerificationInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.SubmitFieldVerification(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleCaptainReadiness(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var input store.CaptainReadinessInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.ReportCaptainReadiness(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleOperatorGovernance(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var input store.OperatorGovernanceInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.GovernStore(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleStoreAudit(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	events, err := store.ListStoreAudit(r.Context(), s.db, r.PathValue("storeId"), 20)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load store audit")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": events})
}

func (s *protectedStoreServer) requireActor(
	w http.ResponseWriter,
	r *http.Request,
	allowedRoles ...string,
) (store.StoreActor, bool) {
	identity, err := s.identity.Resolve(r.Context(), r.Header.Get("Authorization"))
	if errors.Is(err, auth.ErrUnauthenticated) {
		store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer session is missing or invalid")
		return store.StoreActor{}, false
	}
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return store.StoreActor{}, false
	}
	for _, role := range allowedRoles {
		if identity.HasRole(role) {
			return store.StoreActor{ID: identity.Subject, Role: role}, true
		}
	}
	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor role cannot perform this action")
	return store.StoreActor{}, false
}

func (s *protectedStoreServer) writeActionResponse(w http.ResponseWriter, response store.StoreActionResponse, err error) {
	if err == nil {
		store.SendJSON(w, http.StatusOK, response)
		return
	}
	s.writeStoreError(w, err)
}

func (s *protectedStoreServer) writeStoreError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrScopedStoreNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store context not found")
	case errors.Is(err, store.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "store version changed; reload before retrying")
	case errors.Is(err, store.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different request")
	default:
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "required") {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "store action failed")
	}
}

func decodeProtectedJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

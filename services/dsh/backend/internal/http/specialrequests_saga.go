package http

import (
	"net/http"

	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"
)

// GET /dsh/client/special-requests/{requestId}/sagas/{sagaId}
func (s *protectedStoreServer) handleGetClientSpecialRequestSaga(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	saga, err := specialrequests.GetSaga(r.Context(), s.db, r.PathValue("sagaId"))
	if err != nil || saga.OperatorContextID != actor.OperatorContextID || saga.SpecialRequestID != requestID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request saga not found")
		return
	}
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	if _, err := svc.GetForClientInOperatorContext(r.Context(), actor.OperatorContextID, requestID, actor.ID); err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request saga not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"saga": marshalSpecialRequestSaga(saga)})
}

// GET /dsh/operator/special-requests/{requestId}/sagas/{sagaId}
func (s *protectedStoreServer) handleGetOperatorSpecialRequestSaga(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	saga, err := specialrequests.GetSaga(r.Context(), s.db, r.PathValue("sagaId"))
	if err != nil || saga.OperatorContextID != actor.OperatorContextID || saga.SpecialRequestID != requestID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request saga not found")
		return
	}
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	if _, err := svc.GetForOperatorInOperatorContext(r.Context(), actor.OperatorContextID, requestID); err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request saga not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"saga": marshalSpecialRequestSaga(saga)})
}

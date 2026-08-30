package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

func collaborationScope(r *http.Request) (actorID, surface, operatorContextID string) {
	if actor, ok := r.Context().Value(storeActorContextKeyType{}).(store.StoreActor); ok {
		actorID = actor.ID
		surface = actor.SessionSurface
		if surface == "" {
			surface = dshActorSurface(actor.Role)
		}
	}
	operatorContextID, _ = partner.OperatorContextIDFromContext(r.Context())
	return
}

func collaborationIDs(r *http.Request) (partnerID, assignmentID, documentID string) {
	partnerID = r.PathValue("partnerId")
	assignmentID = strings.TrimSpace(r.URL.Query().Get("assignmentId"))
	documentID = strings.TrimSpace(r.URL.Query().Get("documentId"))
	return
}

func writeCollaborationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, partner.ErrCollaborationNotFound), errors.Is(err, partner.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "onboarding collaboration object not found")
	case errors.Is(err, partner.ErrCollaborationForbidden), errors.Is(err, partner.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this onboarding collaboration")
	case errors.Is(err, partner.ErrCollaborationReadOnly):
		store.SendError(w, http.StatusConflict, "READ_ONLY", "field onboarding is read-only until changes are requested")
	case errors.Is(err, partner.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner state changed; reload before requesting changes")
	case errors.Is(err, partner.ErrCollaborationIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "clientMessageId was already used for a different collaboration message")
	case errors.Is(err, partner.ErrInvalidTransition), errors.Is(err, partner.ErrCollaborationInvalid), errors.Is(err, partner.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid onboarding collaboration request")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "onboarding collaboration operation failed")
	}
}

func (s *protectedStoreServer) handleGetOnboardingCollaboration(w http.ResponseWriter, r *http.Request) {
	actorID, surface, contextID := collaborationScope(r)
	partnerID, assignmentID, documentID := collaborationIDs(r)
	view, err := partner.LoadCollaborationView(r.Context(), s.db, actorID, surface, contextID, partnerID, assignmentID, documentID)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, view)
}

func (s *protectedStoreServer) handleAddOnboardingCollaborationMessage(w http.ResponseWriter, r *http.Request) {
	actorID, surface, contextID := collaborationScope(r)
	partnerID, assignmentID, documentID := collaborationIDs(r)
	var input partner.CollaborationMessageInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	message, err := partner.AddCollaborationMessage(r.Context(), s.db, actorID, surface, contextID, partnerID, assignmentID, documentID, input)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"message": message})
}

func (s *protectedStoreServer) handleCreateOnboardingChangeRequest(w http.ResponseWriter, r *http.Request) {
	actorID, _, contextID := collaborationScope(r)
	partnerID, assignmentID, documentID := collaborationIDs(r)
	var input partner.CreateChangeRequestInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
	}
	if strings.TrimSpace(input.CorrelationID) == "" {
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
	}
	request, err := partner.CreateCollaborationChangeRequest(r.Context(), s.db, actorID, contextID, partnerID, assignmentID, documentID, input)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"changeRequest": request})
}

func (s *protectedStoreServer) handleMarkOnboardingCollaborationRead(w http.ResponseWriter, r *http.Request) {
	actorID, surface, contextID := collaborationScope(r)
	threadID := strings.TrimSpace(r.URL.Query().Get("threadId"))
	var input struct {
		Sequence int `json:"sequence"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if err := partner.MarkCollaborationRead(r.Context(), s.db, actorID, surface, contextID, threadID, input.Sequence); err != nil {
		writeCollaborationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]bool{"read": true})
}

func (s *protectedStoreServer) handleListOnboardingWorkload(w http.ResponseWriter, r *http.Request) {
	actorID, surface, contextID := collaborationScope(r)
	items, err := partner.ListFieldOnboardingWorkload(r.Context(), s.db, contextID, actorID, surface)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load field onboarding workload")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *protectedStoreServer) servePartnerHandlerForCollaboration(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) { s.servePartnerHandler(w, r, handler, "field") }
}

func onboardingCollaborationRoutes(mux *http.ServeMux, protected *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/operator/field-onboarding/workload", protected.withTrustedPartnerOperatorContext(protected.withPermission("control-panel", PartnersPermissionRead, protected.handleListOnboardingWorkload)))
	mux.HandleFunc("GET /dsh/field/onboarding/workload", protected.serveFieldOnboardingWorkload)
}

func (s *protectedStoreServer) serveFieldOnboardingWorkload(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	enriched := partnerRequestWithActor(r, actor)
	contextID, ok := partner.OperatorContextIDFromContext(enriched.Context())
	if !ok {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	items, err := partner.ListFieldOnboardingWorkload(enriched.Context(), s.db, contextID, actor.ID, "app-field")
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load field onboarding workload")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"items": items})
}

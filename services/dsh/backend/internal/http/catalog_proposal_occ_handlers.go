package http

import (
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleTransitionCatalogProposalExpected(w http.ResponseWriter, r *http.Request) {
	var input centralcatalog.ProposalTransitionOCCInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	actor, ok := s.requireCatalogPermission(w, r, proposalTransitionPermissionAction(input.NextStatus))
	if !ok {
		return
	}
	proposal, err := centralcatalog.TransitionProposalAtomicExpected(
		r.Context(), s.db, actor.ID, actor.Role, r.PathValue("proposalId"), input,
	)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": proposal})
}

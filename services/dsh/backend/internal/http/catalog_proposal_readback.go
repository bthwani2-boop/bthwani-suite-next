package http

import (
	"net/http"
	"strconv"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// writeStoreScopedProductProposals returns only proposals owned by the resolved
// store. The caller must resolve and authorize the actor/store relationship
// before invoking this helper; storeId is never accepted from a query string.
func (s *protectedStoreServer) writeStoreScopedProductProposals(w http.ResponseWriter, r *http.Request, storeID string) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, total, err := centralcatalog.ListProposals(r.Context(), s.db, centralcatalog.ProposalFilter{
		Status:  r.URL.Query().Get("status"),
		StoreID: storeID,
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	effectiveLimit, effectiveOffset := centralcatalog.ClampListParams(limit, offset)
	store.SendJSON(w, http.StatusOK, map[string]any{
		"proposals": items,
		"total":     total,
		"limit":     effectiveLimit,
		"offset":    effectiveOffset,
	})
}

func (s *protectedStoreServer) handleListPartnerProductProposals(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	s.writeStoreScopedProductProposals(w, r, storeID)
}

func (s *protectedStoreServer) handleListFieldProductProposals(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	s.writeStoreScopedProductProposals(w, r, storeID)
}

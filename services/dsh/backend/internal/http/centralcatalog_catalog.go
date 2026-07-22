package http

import (
	"net/http"
	"strconv"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// ── Operator: domains (L1) ───────────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogDomains(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	domains, err := centralcatalog.ListDomains(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"domains": domains})
}

func (s *protectedStoreServer) handleCreateCatalogDomain(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.DomainInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	d, err := centralcatalog.CreateDomain(r.Context(), s.db, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"domain": d})
}

func (s *protectedStoreServer) handleUpdateCatalogDomain(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.DomainPatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	d, err := centralcatalog.UpdateDomain(r.Context(), s.db, r.PathValue("domainId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"domain": d})
}

// ── Operator: nodes (L2/L3/L4) ──────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogNodes(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	nodes, err := centralcatalog.ListNodes(r.Context(), s.db, r.URL.Query().Get("domainId"), r.URL.Query().Get("parentId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"nodes": nodes})
}

func (s *protectedStoreServer) handleCreateCatalogNode(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.NodeInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	n, err := centralcatalog.CreateNode(r.Context(), s.db, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"node": n})
}

func (s *protectedStoreServer) handleUpdateCatalogNode(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.NodePatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	n, err := centralcatalog.UpdateNode(r.Context(), s.db, r.PathValue("nodeId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"node": n})
}

// ── Taxonomy (read-only domains+nodes) for partner/field surfaces ──────────

func (s *protectedStoreServer) handleCatalogTaxonomy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "field", "operator")
	if !ok {
		return
	}
	domains, err := centralcatalog.ListDomains(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	nodes, err := centralcatalog.ListNodes(r.Context(), s.db, "", "")
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	if actor.Role != "operator" {
		visibleDomainIDs := make(map[string]struct{})
		visibleDomains := make([]centralcatalog.Domain, 0, len(domains))
		for _, domain := range domains {
			if domain.IsActive && domain.IsClientVisible && !domain.IsManualRequest {
				visibleDomainIDs[domain.ID] = struct{}{}
				visibleDomains = append(visibleDomains, domain)
			}
		}
		visibleNodes := make([]centralcatalog.Node, 0, len(nodes))
		for _, node := range nodes {
			if _, domainVisible := visibleDomainIDs[node.DomainID]; domainVisible && node.IsActive && node.IsClientVisible {
				visibleNodes = append(visibleNodes, node)
			}
		}
		domains = visibleDomains
		nodes = visibleNodes
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"domains": domains, "nodes": nodes})
}

// ── Operator: master products (L5) ──────────────────────────────────────────

func (s *protectedStoreServer) handleListMasterProducts(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	approvalStatus := r.URL.Query().Get("approvalStatus")
	activeOnly := false
	if actor.Role != "operator" {
		approvalStatus = "approved"
		activeOnly = true
	}
	filter := centralcatalog.MasterProductFilter{
		DomainID:       r.URL.Query().Get("domainId"),
		CategoryNodeID: r.URL.Query().Get("categoryNodeId"),
		ApprovalStatus: approvalStatus,
		ActiveOnly:     activeOnly,
		Search:         r.URL.Query().Get("search"),
		Limit:          limit,
		Offset:         offset,
	}
	items, total, err := centralcatalog.ListMasterProducts(r.Context(), s.db, filter)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	effectiveLimit, effectiveOffset := centralcatalog.ClampListParams(limit, offset)
	store.SendJSON(w, http.StatusOK, map[string]any{
		"masterProducts": items, "total": total, "limit": effectiveLimit, "offset": effectiveOffset,
	})
}

func (s *protectedStoreServer) handleCreateMasterProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProductManage, "operator"); !ok {
		return
	}
	var input centralcatalog.MasterProductInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	m, err := centralcatalog.CreateMasterProduct(r.Context(), s.db, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"masterProduct": m})
}

func (s *protectedStoreServer) handleUpdateMasterProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProductManage, "operator"); !ok {
		return
	}
	var input centralcatalog.MasterProductPatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	m, err := centralcatalog.UpdateMasterProduct(r.Context(), s.db, r.PathValue("productId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"masterProduct": m})
}

// ── Product proposals ────────────────────────────────────────────────────────

func (s *protectedStoreServer) handleListProductProposals(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProposalRead, "operator"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, total, err := centralcatalog.ListProposals(r.Context(), s.db, centralcatalog.ProposalFilter{
		Status: r.URL.Query().Get("status"), StoreID: r.URL.Query().Get("storeId"), Limit: limit, Offset: offset,
	})
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	effectiveLimit, effectiveOffset := centralcatalog.ClampListParams(limit, offset)
	store.SendJSON(w, http.StatusOK, map[string]any{
		"proposals": items, "total": total, "limit": effectiveLimit, "offset": effectiveOffset,
	})
}

func decideProposalPermissionAction(decision string) string {
	if decision == "adopted" {
		return CatalogPermissionProposalAdopt
	}
	return CatalogPermissionProposalReview
}

func proposalTransitionPermissionAction(nextStatus string) string {
	switch nextStatus {
	case "marketing-review":
		return CatalogPermissionProposalMarketingReview
	case "catalog-adopted":
		return CatalogPermissionProposalAdopt
	case "client-visible":
		return CatalogPermissionProposalPublish
	default:
		return CatalogPermissionProposalReview
	}
}

func (s *protectedStoreServer) handleDecideProductProposal(w http.ResponseWriter, r *http.Request) {
	var input centralcatalog.ProposalDecisionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	actor, ok := s.requireCatalogPermission(w, r, decideProposalPermissionAction(input.Decision), "operator")
	if !ok {
		return
	}
	p, err := centralcatalog.DecideProposal(r.Context(), s.db, actor.ID, actor.Role, r.PathValue("proposalId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": p})
}

func (s *protectedStoreServer) handleTransitionProductProposal(w http.ResponseWriter, r *http.Request) {
	var input centralcatalog.ProposalTransitionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	actor, ok := s.requireCatalogPermission(w, r, proposalTransitionPermissionAction(input.NextStatus), "operator")
	if !ok {
		return
	}
	p, err := centralcatalog.TransitionProposal(r.Context(), s.db, actor.ID, actor.Role, r.PathValue("proposalId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": p})
}

func (s *protectedStoreServer) createProductProposal(w http.ResponseWriter, r *http.Request, actorID string, forcedStoreID *string) {
	var input centralcatalog.ProductProposalInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if forcedStoreID != nil {
		input.SourceStoreID = forcedStoreID
	}
	p, err := centralcatalog.CreateProposal(r.Context(), s.db, actorID, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"proposal": p})
}

func (s *protectedStoreServer) handleUpdatePartnerProductProposal(w http.ResponseWriter, r *http.Request) {
	actor, _, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input centralcatalog.ProductProposalPatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	p, err := centralcatalog.UpdateProposal(r.Context(), s.db, r.PathValue("proposalId"), actor.ID, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": p})
}

func (s *protectedStoreServer) handleUpdateFieldProductProposal(w http.ResponseWriter, r *http.Request) {
	actorID, _, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	var input centralcatalog.ProductProposalPatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	p, err := centralcatalog.UpdateProposal(r.Context(), s.db, r.PathValue("proposalId"), actorID, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": p})
}

func (s *protectedStoreServer) handlePartnerCreateProductProposal(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	sid := storeID
	s.createProductProposal(w, r, actor.ID, &sid)
}

func (s *protectedStoreServer) handleFieldCreateProductProposal(w http.ResponseWriter, r *http.Request) {
	actorID, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	s.createProductProposal(w, r, actorID, &storeID)
}

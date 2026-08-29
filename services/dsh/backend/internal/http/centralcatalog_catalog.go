package http

import (
	"net/http"
	"strconv"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// ── Operator: domains (L1) ───────────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogDomains(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyRead); !ok {
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage); !ok {
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

// ── Operator: nodes (L2/L3/L4) ──────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogNodes(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyRead); !ok {
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage); !ok {
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

func (s *protectedStoreServer) handleMoveCatalogNode(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage); !ok {
		return
	}
	var input struct {
		TargetParentID *string `json:"targetParentId"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	n, err := centralcatalog.MoveNode(r.Context(), s.db, r.PathValue("nodeId"), input.TargetParentID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"node": n})
}

func (s *protectedStoreServer) handleMergeCatalogNode(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage); !ok {
		return
	}
	var input struct {
		TargetNodeID string `json:"targetNodeId"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	defer tx.Rollback()

	if err := centralcatalog.MergeNode(r.Context(), tx, r.PathValue("nodeId"), input.TargetNodeID); err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (s *protectedStoreServer) handleDeprecateCatalogNode(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage); !ok {
		return
	}
	n, err := centralcatalog.DeprecateNode(r.Context(), s.db, r.PathValue("nodeId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"node": n})
}

// ── Taxonomy (read-only domains+nodes) for partner/field surfaces ──────────

func (s *protectedStoreServer) handleCatalogTaxonomy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "field")
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
	if actor.Role == "operator" {
		if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProductRead); !ok {
			return
		}
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	approvalStatus := r.URL.Query().Get("approvalStatus")
	activeOnly := false
	if actor.Role != "operator" {
		approvalStatus = "approved"
		activeOnly = true
	}
	var parentIDFilter *string
	if r.URL.Query().Has("parentId") {
		val := r.URL.Query().Get("parentId")
		parentIDFilter = &val
	}
	var isStandaloneFilter *bool
	if r.URL.Query().Has("isStandalone") {
		val := r.URL.Query().Get("isStandalone") == "true"
		isStandaloneFilter = &val
	}

	filter := centralcatalog.MasterProductFilter{
		DomainID:       r.URL.Query().Get("domainId"),
		CategoryNodeID: r.URL.Query().Get("categoryNodeId"),
		ApprovalStatus: approvalStatus,
		ActiveOnly:     activeOnly,
		Search:         r.URL.Query().Get("search"),
		ParentID:       parentIDFilter,
		IsStandalone:   isStandaloneFilter,
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProductManage); !ok {
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

// ── Product proposals ────────────────────────────────────────────────────────

func (s *protectedStoreServer) handleListProductProposals(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProposalRead); !ok {
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

func (s *protectedStoreServer) handlePartnerCreateProductProposal(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	sid := storeID
	s.createProductProposal(w, r, actor.ID, &sid)
}

func (s *protectedStoreServer) handleFieldCreateProductProposal(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	s.createProductProposal(w, r, actor.ID, &storeID)
}

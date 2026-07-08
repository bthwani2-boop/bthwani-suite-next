package http

import (
	"errors"
	"net/http"
	"strconv"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) writeCentralCatalogError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, centralcatalog.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "central catalog entity not found")
	case errors.Is(err, centralcatalog.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid central catalog input")
	case errors.Is(err, centralcatalog.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "action not permitted by platform policy")
	case errors.Is(err, centralcatalog.ErrConflict):
		store.SendError(w, http.StatusConflict, "CONFLICT", "central catalog conflict")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "central catalog operation failed")
	}
}

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
	if _, ok := s.requireActor(w, r, "operator"); !ok {
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
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	var input centralcatalog.DomainInput
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
	if _, ok := s.requireActor(w, r, "operator"); !ok {
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
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	var input centralcatalog.NodeInput
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
	if _, ok := s.requireActor(w, r, "partner", "field", "operator"); !ok {
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
	store.SendJSON(w, http.StatusOK, map[string]any{"domains": domains, "nodes": nodes})
}

// ── Operator: master products (L5) ──────────────────────────────────────────

func (s *protectedStoreServer) handleListMasterProducts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	filter := centralcatalog.MasterProductFilter{
		DomainID:       r.URL.Query().Get("domainId"),
		CategoryNodeID: r.URL.Query().Get("categoryNodeId"),
		ApprovalStatus: r.URL.Query().Get("approvalStatus"),
		Search:         r.URL.Query().Get("search"),
		Limit:          limit,
		Offset:         offset,
	}
	items, err := centralcatalog.ListMasterProducts(r.Context(), s.db, filter)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"masterProducts": items})
}

func (s *protectedStoreServer) handleCreateMasterProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
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
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	var input centralcatalog.MasterProductInput
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
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := centralcatalog.ListProposals(r.Context(), s.db, centralcatalog.ProposalFilter{
		Status: r.URL.Query().Get("status"), StoreID: r.URL.Query().Get("storeId"), Limit: limit, Offset: offset,
	})
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposals": items})
}

func (s *protectedStoreServer) handleDecideProductProposal(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var input centralcatalog.ProposalDecisionInput
	if !decodeProtectedJSON(w, r, &input) {
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
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var input centralcatalog.ProposalTransitionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	p, err := centralcatalog.TransitionProposal(r.Context(), s.db, actor.ID, actor.Role, r.PathValue("proposalId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": p})
}

// createProductProposal is shared by the partner and field POST endpoints;
// both are requests-to-add, never a final product (rule 2 of the
// sovereignty decision).
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
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	s.createProductProposal(w, r, actor.ID, nil)
}

// ── Platform catalog policies ────────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogPolicies(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	items, err := centralcatalog.ListCatalogPolicies(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policies": items})
}

func (s *protectedStoreServer) handleUpdateCatalogPolicy(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	var input centralcatalog.CatalogPolicyInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	p, err := centralcatalog.UpdateCatalogPolicy(r.Context(), s.db, r.PathValue("policyId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": p})
}

// ── Store assortment ─────────────────────────────────────────────────────────

func (s *protectedStoreServer) handleOperatorGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	items, err := centralcatalog.ListStoreAssortment(r.Context(), s.db, r.PathValue("storeId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": items})
}

// upsertStoreAssortment resolves the master product's effective platform
// policy before writing, so a local image is only ever accepted when the
// category's policy allows it (Phase 8) — never left to the caller's word.
func (s *protectedStoreServer) upsertStoreAssortment(w http.ResponseWriter, r *http.Request, actorID, storeID string) {
	masterProductID := r.PathValue("masterProductId")
	var input centralcatalog.StoreAssortmentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	mp, err := centralcatalog.GetMasterProduct(r.Context(), s.db, masterProductID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	nodeID := ""
	if mp.CategoryNodeID != nil {
		nodeID = *mp.CategoryNodeID
	}
	policy, err := centralcatalog.ResolveEffectivePolicy(r.Context(), s.db, mp.DomainID, nodeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	a, err := centralcatalog.UpsertStoreAssortment(r.Context(), s.db, storeID, masterProductID, actorID, input, policy.AllowsStoreProductCustomImage)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": a})
}

func (s *protectedStoreServer) handleOperatorUpsertStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	s.upsertStoreAssortment(w, r, actor.ID, r.PathValue("storeId"))
}

func (s *protectedStoreServer) handlePartnerGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	_ = actor
	items, err := centralcatalog.ListStoreAssortment(r.Context(), s.db, storeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": items})
}

func (s *protectedStoreServer) handlePartnerUpsertStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	s.upsertStoreAssortment(w, r, actor.ID, storeID)
}

func (s *protectedStoreServer) handleFieldUpsertStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actorID, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to this partner draft")
		return
	}
	s.upsertStoreAssortment(w, r, actorID, storeID)
}

// ── Catalog assets (DAM) ─────────────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogAssets(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := centralcatalog.ListAssets(r.Context(), s.db, r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assets": items})
}

func (s *protectedStoreServer) handleCreateAssetUploadIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	var input centralcatalog.AssetUploadIntentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	a, err := centralcatalog.CreateAssetUploadIntent(r.Context(), s.db, actor.ID, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"asset": a})
}

func (s *protectedStoreServer) handleUpdateCatalogAsset(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	var input centralcatalog.AssetUpdateInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	a, err := centralcatalog.UpdateAsset(r.Context(), s.db, r.PathValue("assetId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": a})
}

func (s *protectedStoreServer) handleReviewCatalogAsset(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var input centralcatalog.AssetReviewInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	a, err := centralcatalog.ReviewAsset(r.Context(), s.db, actor.ID, r.PathValue("assetId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": a})
}

func (s *protectedStoreServer) handleLinkCatalogAsset(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	var input centralcatalog.AssetLinkInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.AssetID = r.PathValue("assetId")
	link, err := centralcatalog.LinkAsset(r.Context(), s.db, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"link": link})
}

func (s *protectedStoreServer) handleUnlinkCatalogAsset(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	err := centralcatalog.UnlinkAsset(r.Context(), s.db, r.URL.Query().Get("entityType"), r.URL.Query().Get("entityId"), r.PathValue("linkId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"unlinked": true})
}

func (s *protectedStoreServer) handleListCatalogAssetLinks(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator", "partner", "field"); !ok {
		return
	}
	links, err := centralcatalog.ListAssetLinks(r.Context(), s.db, r.URL.Query().Get("entityType"), r.URL.Query().Get("entityId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"links": links})
}

// ── Seed status diagnostics ──────────────────────────────────────────────────

func (s *protectedStoreServer) handleCatalogSeedStatus(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	status, err := centralcatalog.GetSeedStatus(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, status)
}

func (s *protectedStoreServer) handlePutDomainImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	domainID := r.PathValue("domainId")
	role := r.PathValue("role")
	s.putEntityImage(w, r, "domain", domainID, role)
}

func (s *protectedStoreServer) handlePutNodeImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	nodeID := r.PathValue("nodeId")
	role := r.PathValue("role")
	s.putEntityImage(w, r, "node", nodeID, role)
}

func (s *protectedStoreServer) handlePutMasterProductImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	productID := r.PathValue("productId")
	role := r.PathValue("role")
	s.putEntityImage(w, r, "master_product", productID, role)
}

func (s *protectedStoreServer) handlePutProductProposalImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	proposalID := r.PathValue("proposalId")
	role := r.PathValue("role")
	s.putEntityImage(w, r, "product_proposal", proposalID, role)
}

type EntityImageInput struct {
	AssetID string `json:"assetId"`
}

func (s *protectedStoreServer) putEntityImage(w http.ResponseWriter, r *http.Request, entityType, entityID, role string) {
	var input EntityImageInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}

	// Reset any existing primary image for this entity & role
	_, err := s.db.ExecContext(r.Context(), `UPDATE dsh_catalog_asset_links
		SET is_primary=false, updated_at=now()
		WHERE entity_type=$1 AND entity_id=$2 AND role=$3`, entityType, entityID, role)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}

	// Link the new asset as primary
	link, err := centralcatalog.LinkAsset(r.Context(), s.db, centralcatalog.AssetLinkInput{
		AssetID:    input.AssetID,
		EntityType: entityType,
		EntityID:   entityID,
		Role:       role,
		SortOrder:  0,
		IsPrimary:  true,
	})
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"link": link})
}

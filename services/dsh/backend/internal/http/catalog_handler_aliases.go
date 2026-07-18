package http

import "net/http"

func (s *protectedStoreServer) handleListCatalogMasterProducts(w http.ResponseWriter, r *http.Request) {
	s.handleListMasterProducts(w, r)
}

func (s *protectedStoreServer) handleCreateCatalogMasterProduct(w http.ResponseWriter, r *http.Request) {
	s.handleCreateMasterProduct(w, r)
}

func (s *protectedStoreServer) handleListCatalogProposals(w http.ResponseWriter, r *http.Request) {
	s.handleListProductProposals(w, r)
}

func (s *protectedStoreServer) handleListCatalogPlatformPolicies(w http.ResponseWriter, r *http.Request) {
	s.handleListCatalogPolicies(w, r)
}

func (s *protectedStoreServer) handleGetOperatorStoreAssortment(w http.ResponseWriter, r *http.Request) {
	s.handleOperatorGetStoreAssortment(w, r)
}

func (s *protectedStoreServer) handleListFieldCatalogDomains(w http.ResponseWriter, r *http.Request) {
	s.handleCatalogTaxonomy(w, r)
}

func (s *protectedStoreServer) handleListFieldCatalogNodes(w http.ResponseWriter, r *http.Request) {
	s.handleCatalogTaxonomy(w, r)
}

func (s *protectedStoreServer) handleListFieldCatalogMasterProducts(w http.ResponseWriter, r *http.Request) {
	s.handleListMasterProducts(w, r)
}

func (s *protectedStoreServer) handleGetFieldStoreAssortment(w http.ResponseWriter, r *http.Request) {
	s.handleFieldGetStoreAssortment(w, r)
}

func (s *protectedStoreServer) handleListPartnerCatalogDomains(w http.ResponseWriter, r *http.Request) {
	s.handleCatalogTaxonomy(w, r)
}

func (s *protectedStoreServer) handleListPartnerCatalogNodes(w http.ResponseWriter, r *http.Request) {
	s.handleCatalogTaxonomy(w, r)
}

func (s *protectedStoreServer) handleListPartnerCatalogMasterProducts(w http.ResponseWriter, r *http.Request) {
	s.handleListMasterProducts(w, r)
}

func (s *protectedStoreServer) handleCreatePartnerCatalogProposal(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerCreateProductProposal(w, r)
}

func (s *protectedStoreServer) handleListPartnerCatalogProposals(w http.ResponseWriter, r *http.Request) {
	s.handleListProductProposals(w, r)
}

func (s *protectedStoreServer) handleGetPartnerStoreAssortment(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerGetStoreAssortment(w, r)
}

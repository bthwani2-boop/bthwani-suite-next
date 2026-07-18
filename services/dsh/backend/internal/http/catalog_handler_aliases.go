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

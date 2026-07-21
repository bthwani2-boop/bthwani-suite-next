package http

import (
	"net/http"

	"dsh-api/internal/partner"
)

func (s *protectedStoreServer) handleGovernedGetPartner(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleGovernedGetPartner(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleGovernedActivationTransition(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleGovernedActivationTransition(s.db, s.wlt), PartnersPermissionActivate, "operator")
}

func (s *protectedStoreServer) handleGovernedLinkPartnerStore(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleGovernedLinkPartnerStore(s.db), PartnersPermissionManage, "operator")
}

func (s *protectedStoreServer) handleGovernedFieldGetPartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleGovernedFieldGetPartner(s.db), "field")
}

func (s *protectedStoreServer) handleGovernedFieldUpdatePartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleGovernedFieldUpdatePartner(s.db, s.wlt), "field")
}

func (s *protectedStoreServer) handleGovernedFieldCreatePartnerVisit(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleGovernedFieldCreateVisit(s.db), "field")
}

func (s *protectedStoreServer) handleGovernedFieldSubmitPartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleGovernedFieldSubmitPartner(s.db), "field")
}

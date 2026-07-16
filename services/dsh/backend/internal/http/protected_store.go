package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/homediscovery"
	"dsh-api/internal/media"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

type protectedStoreServer struct {
	db       *sql.DB
	identity *auth.Client
	wlt      *wlt.Client
	media    *media.Provider
}

// Partners permission actions on the control-panel surface, covering store
// listing/governance (partners & stores nav). "operator" remains a valid
// fallback role during RBAC data migration.
const (
	PartnersPermissionRead     = "partners.read"
	PartnersPermissionManage   = "partners.manage"
	PartnersPermissionActivate = "partners.activate"
)

func (s *protectedStoreServer) handleHomeDiscoveryAdminList(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator")
	if !ok {
		return
	}
	items, err := homediscovery.ListAdminContent(r.Context(), s.db, r.PathValue("kind"))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *protectedStoreServer) handleHomeDiscoveryAdminCreate(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var input homediscovery.AdminContentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := homediscovery.CreateAdminContent(r.Context(), s.db, r.PathValue("kind"), actor.ID, r.Header.Get("X-Correlation-ID"), input)
	s.writeHomeDiscoveryAdminResult(w, http.StatusCreated, item, err)
}

func (s *protectedStoreServer) handleHomeDiscoveryAdminUpdate(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var input homediscovery.AdminContentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := homediscovery.UpdateAdminContent(r.Context(), s.db, r.PathValue("kind"), r.PathValue("itemId"), actor.ID, r.Header.Get("X-Correlation-ID"), input)
	s.writeHomeDiscoveryAdminResult(w, http.StatusOK, item, err)
}

func (s *protectedStoreServer) handleHomeDiscoveryAdminDelete(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	err := homediscovery.DeleteAdminContent(r.Context(), s.db, r.PathValue("kind"), r.PathValue("itemId"), actor.ID, r.Header.Get("X-Correlation-ID"))
	if errors.Is(err, homediscovery.ErrAdminContentNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) writeHomeDiscoveryAdminResult(w http.ResponseWriter, status int, item homediscovery.AdminContentItem, err error) {
	if errors.Is(err, homediscovery.ErrAdminContentNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, status, map[string]any{"item": item})
}

func newProtectedStoreServer(db *sql.DB, identity *auth.Client, wltClient *wlt.Client, mediaProvider *media.Provider) *protectedStoreServer {
	return &protectedStoreServer{db: db, identity: identity, wlt: wltClient, media: mediaProvider}
}

func (s *protectedStoreServer) mediaClient() *media.Client {
	if s.media == nil {
		return nil
	}
	return s.media.Client()
}

func partnerRequestWithActor(r *http.Request, actor store.StoreActor) *http.Request {
	ctx := context.WithValue(r.Context(), "actor_id", actor.ID)
	ctx = context.WithValue(ctx, "actor_phone", actor.PhoneE164)
	ctx = context.WithValue(ctx, "actor_surface", dshActorSurface(actor.Role))
	return r.WithContext(ctx)
}

func dshActorSurface(role string) string {
	switch role {
	case "operator":
		return "control-panel"
	case "partner":
		return "app-partner"
	case "field":
		return "app-field"
	case "captain":
		return "app-captain"
	case "system":
		return "system"
	default:
		return "system"
	}
}

func partnerRequestWithStore(r *http.Request, actor store.StoreActor, storeID string) *http.Request {
	ctx := partnerRequestWithActor(r, actor).Context()
	ctx = context.WithValue(ctx, "store_id", storeID)
	return r.WithContext(ctx)
}

func (s *protectedStoreServer) servePartnerHandler(
	w http.ResponseWriter,
	r *http.Request,
	handler http.HandlerFunc,
	roles ...string,
) {
	actor, ok := s.requireActor(w, r, roles...)
	if !ok {
		return
	}
	handler(w, partnerRequestWithActor(r, actor))
}

// servePartnerPermissionHandler is servePartnerHandler's fine-grained
// counterpart: it grants access via a Permission{Service:"dsh",
// Surface:"control-panel", Action:action} entry in addition to the
// fallbackRoles, mirroring requirePermission.
func (s *protectedStoreServer) servePartnerPermissionHandler(
	w http.ResponseWriter,
	r *http.Request,
	handler http.HandlerFunc,
	action string,
	fallbackRoles ...string,
) {
	actor, ok := s.requirePermission(w, r, "control-panel", action, fallbackRoles...)
	if !ok {
		return
	}
	handler(w, partnerRequestWithActor(r, actor))
}

func (s *protectedStoreServer) servePartnerSelfHandler(
	w http.ResponseWriter,
	r *http.Request,
	handler http.HandlerFunc,
) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	row, _, err := store.ResolveActorStore(r.Context(), s.db, actor)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	handler(w, partnerRequestWithStore(r, actor, row.ID))
}

func (s *protectedStoreServer) handleListPartners(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListPartners(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleCreatePartner(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleCreatePartner(s.db), PartnersPermissionManage, "operator")
}

func (s *protectedStoreServer) handleGetPartner(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleGetPartner(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleActivationTransition(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleActivationTransition(s.db), PartnersPermissionActivate, "operator")
}

func (s *protectedStoreServer) handleGetPartnerReadiness(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleGetReadiness(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleListPartnerDocuments(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListDocuments(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleAddPartnerDocument(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleAddDocument(s.db), PartnersPermissionManage, "operator")
}

func (s *protectedStoreServer) handleReviewPartnerDocument(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleReviewDocument(s.db), PartnersPermissionManage, "operator")
}

func (s *protectedStoreServer) handleListPartnerStores(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListPartnerStores(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleLinkPartnerStore(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleLinkPartnerStore(s.db), PartnersPermissionManage, "operator")
}

func (s *protectedStoreServer) handleListPartnerFieldVisits(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListFieldVisits(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleListPartnerAudit(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListAudit(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleFieldListPartnerDrafts(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleListFieldPartnerDrafts(s.db), "field")
}

func (s *protectedStoreServer) handleFieldCreatePartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldCreateDraft(s.db), "field")
}

func (s *protectedStoreServer) handleFieldGetPartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldGetPartner(s.db), "field")
}

func (s *protectedStoreServer) handleFieldUpdatePartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldUpdatePartner(s.db), "field")
}

func (s *protectedStoreServer) handleFieldUploadPartnerDocument(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldUploadDocument(s.db), "field")
}

func (s *protectedStoreServer) handleFieldCreatePartnerVisit(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldCreateVisit(s.db), "field")
}

func (s *protectedStoreServer) handleFieldSubmitPartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldSubmitPartner(s.db), "field")
}

func (s *protectedStoreServer) handleFieldGetPartnerReadiness(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldGetReadiness(s.db), "field")
}

func (s *protectedStoreServer) handleFieldListPartnerDocuments(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldListDocuments(s.db), "field")
}

func (s *protectedStoreServer) handleFieldListPartnerFieldVisits(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldListFieldVisits(s.db), "field")
}

func (s *protectedStoreServer) handlePartnerActivationReadiness(w http.ResponseWriter, r *http.Request) {
	s.servePartnerSelfHandler(w, r, partner.HandlePartnerMeReadiness(s.db))
}

func (s *protectedStoreServer) handleStoreContext(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "field", "captain", "operator")
	if !ok {
		return
	}
	row, scope, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, r.URL.Query().Get("storeId"))
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	events, _ := store.ListStoreAudit(r.Context(), s.db, row.ID, 1)
	var latest any
	if len(events) > 0 {
		latest = events[0]
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"actorRole":    actor.Role,
		"scope":        scope.Type,
		"store":        store.RowToDetail(*row),
		"latestAction": latest,
	})
}

func (s *protectedStoreServer) handleOperatorStores(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead, "operator")
	if !ok {
		return
	}
	result, err := store.ListAllStores(s.db, store.DshStoreListQuery{Limit: 100, Offset: 0})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load stores")
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}

func (s *protectedStoreServer) handleOperatorStoreDetail(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead, "operator")
	if !ok {
		return
	}
	row, err := store.GetStoreByIDInternal(r.Context(), s.db, r.PathValue("storeId"))
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"store": store.RowToDetail(*row)})
}

func (s *protectedStoreServer) handleOperatorStoreDiagnostics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead, "operator")
	if !ok {
		return
	}
	storeId := r.PathValue("storeId")
	row, err := store.GetStoreByIDInternal(r.Context(), s.db, storeId)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}

	blockers := []string{}
	// Example logic for publication blockers
	if row.LogoURL == nil || *row.LogoURL == "" {
		blockers = append(blockers, "Missing store logo")
	}
	if row.HeroImageURL == nil || *row.HeroImageURL == "" {
		blockers = append(blockers, "Missing store cover image")
	}

	isReady := len(blockers) == 0

	store.SendJSON(w, http.StatusOK, map[string]any{
		"isReady":  isReady,
		"blockers": blockers,
	})
}

func (s *protectedStoreServer) handlePartnerSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	var input store.PartnerSettingsInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.UpdatePartnerSettings(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleGetPartnerSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	row, err := store.GetStoreByIDInternal(r.Context(), s.db, storeID)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"storeId":        row.ID,
		"status":         row.Status,
		"deliveryModes":  row.DeliveryModes,
		"storeOpen":      row.Status == store.StatusActive,
		"listingEnabled": row.IsVisible,
		"version":        row.Version,
	})
}

func (s *protectedStoreServer) handleFieldVerification(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	var input store.FieldVerificationInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.SubmitFieldVerification(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleCaptainReadiness(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var input store.CaptainReadinessInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.ReportCaptainReadiness(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleOperatorGovernance(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionManage, "operator")
	if !ok {
		return
	}
	var input store.OperatorGovernanceInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.GovernStore(
		r.Context(), s.db, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	s.writeActionResponse(w, response, err)
}

func (s *protectedStoreServer) handleStoreAudit(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead, "operator")
	if !ok {
		return
	}
	events, err := store.ListStoreAudit(r.Context(), s.db, r.PathValue("storeId"), 20)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load store audit")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": events})
}

// ─── Store team, courier settings, coverage zones, partner scopes (DSH-050) ─
// Thin auth wrappers: verify the actor can access storeId via the existing
// store.ActorCanAccessStore primitive, then delegate to the pure business
// handler in partner/handler.go. Mirrors handleGetPartnerSettings above.

func (s *protectedStoreServer) handlePartnerStoreTeam(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	partner.HandleGetStoreTeam(s.db)(w, partnerRequestWithActor(r, actor))
}

func (s *protectedStoreServer) handlePartnerInviteTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	partner.HandleInviteStoreTeamMember(s.db)(w, partnerRequestWithActor(r, actor))
}

func (s *protectedStoreServer) handlePartnerListInvites(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	partner.HandleListInvites(s.db)(w, partnerRequestWithActor(r, actor))
}

func (s *protectedStoreServer) handlePartnerAcceptInvite(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	partner.HandleAcceptInvite(s.db)(w, partnerRequestWithActor(r, actor))
}

func (s *protectedStoreServer) handlePartnerRejectInvite(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	partner.HandleRejectInvite(s.db)(w, partnerRequestWithActor(r, actor))
}

func (s *protectedStoreServer) handlePartnerTeamMemberAction(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	partner.HandleExecuteStoreTeamMemberAction(s.db)(w, partnerRequestWithActor(r, actor))
}

func (s *protectedStoreServer) handlePartnerGetCourierSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	partner.HandleGetStoreCourierSettings(s.db)(w, r)
}

func (s *protectedStoreServer) handlePartnerUpdateCourierSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	partner.HandleUpdateStoreCourierSettings(s.db)(w, r)
}

func (s *protectedStoreServer) handlePartnerCoverageZones(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	partner.HandleListStoreCoverageZones(s.db)(w, r)
}

func (s *protectedStoreServer) handlePartnerScopes(w http.ResponseWriter, r *http.Request) {
	s.servePartnerSelfHandler(w, r, partner.HandleListPartnerScopes(s.db))
}

func (s *protectedStoreServer) requireActor(
	w http.ResponseWriter,
	r *http.Request,
	allowedRoles ...string,
) (store.StoreActor, bool) {
	identity, err := s.identity.Resolve(r.Context(), r.Header.Get("Authorization"))
	if errors.Is(err, auth.ErrUnauthenticated) {
		store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer session is missing or invalid")
		return store.StoreActor{}, false
	}
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return store.StoreActor{}, false
	}
	for _, role := range allowedRoles {
		if identity.HasRole(role) {
			return store.StoreActor{ID: identity.Subject, Role: role, PhoneE164: identity.PhoneE164}, true
		}
	}
	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor role cannot perform this action")
	return store.StoreActor{}, false
}

// requirePermission is the sovereign fine-grained access check: it keeps
// 100% of the flat role-based access operators already have (via
// fallbackRoles), but also grants access to any actor whose identity carries
// a Permission{Service:"dsh", Surface:surface, Action:action} entry --
// letting a non-operator be granted just one narrow capability (e.g. media
// review) without full operator power. surface must be one of Identity's
// contract-defined surfaces (core/identity/contracts/auth.openapi.yaml);
// "control-panel" is used for every control-panel-governed domain (catalog,
// marketing, finance, administration, ...) rather than inventing a
// domain-specific surface per feature.
func (s *protectedStoreServer) requirePermission(
	w http.ResponseWriter,
	r *http.Request,
	surface string,
	action string,
	fallbackRoles ...string,
) (store.StoreActor, bool) {
	identity, err := s.identity.Resolve(r.Context(), r.Header.Get("Authorization"))
	if errors.Is(err, auth.ErrUnauthenticated) {
		store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer session is missing or invalid")
		return store.StoreActor{}, false
	}
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return store.StoreActor{}, false
	}
	for _, role := range fallbackRoles {
		if identity.HasRole(role) {
			return store.StoreActor{ID: identity.Subject, Role: role}, true
		}
	}
	for _, p := range identity.Permissions {
		if p.Service == "dsh" && p.Surface == surface && p.Action == action {
			return store.StoreActor{ID: identity.Subject, Role: "permission:" + action}, true
		}
	}
	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor role cannot perform this action")
	return store.StoreActor{}, false
}

// requireCatalogPermission is requirePermission scoped to the control-panel
// surface, kept as a named wrapper because every centralcatalog.go call site
// reads more clearly with the surface implied.
func (s *protectedStoreServer) requireCatalogPermission(
	w http.ResponseWriter,
	r *http.Request,
	action string,
	fallbackRoles ...string,
) (store.StoreActor, bool) {
	return s.requirePermission(w, r, "control-panel", action, fallbackRoles...)
}

func (s *protectedStoreServer) writeActionResponse(w http.ResponseWriter, response store.StoreActionResponse, err error) {
	if err == nil {
		store.SendJSON(w, http.StatusOK, response)
		return
	}
	s.writeStoreError(w, err)
}

func (s *protectedStoreServer) writeStoreError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrScopedStoreNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store context not found")
	case errors.Is(err, store.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "store version changed; reload before retrying")
	case errors.Is(err, store.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different request")
	default:
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "required") {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "store action failed")
	}
}

func decodeProtectedJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/homediscovery"
	"dsh-api/internal/mapproviders"
	"dsh-api/internal/media"
	"dsh-api/internal/partner"
	"dsh-api/internal/platformclient"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
	"dsh-api/internal/workforceclient"
)

type protectedStoreServer struct {
	db              *sql.DB
	identity        *auth.Client
	wlt             *wlt.Client
	platformClient  *platformclient.Client
	media           *media.Provider
	workforce       *workforceclient.Client
	decisionService store.DecisionService
	maps            *mapproviders.Client
}

// Partners permission actions on the control-panel surface, covering store
// listing and governance. Identity permissions are the only capability source.
const (
	PartnersPermissionRead     = "partners.read"
	PartnersPermissionManage   = "partners.manage"
	PartnersPermissionActivate = "partners.activate"
)

func (s *protectedStoreServer) handleHomeDiscoveryAdminList(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead)
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
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage)
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
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage)
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
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage)
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

func newProtectedStoreServer(db *sql.DB, identity *auth.Client, wltClient *wlt.Client, platformClient *platformclient.Client, mediaProvider *media.Provider) *protectedStoreServer {
	decisionService, err := store.NewConfiguredDispatchDecisionServiceFromEnv()
	if err != nil {
		decisionService = nil
	}
	var configuredDecisionService store.DecisionService = decisionService
	if configuredDecisionService == nil {
		configuredDecisionService = store.FailClosedDecisionService(err)
	}
	return &protectedStoreServer{
		db:              db,
		identity:        identity,
		wlt:             wltClient,
		platformClient:  platformClient,
		media:           mediaProvider,
		workforce:       workforceclient.NewClient(os.Getenv("DSH_WORKFORCE_BASE_URL"), os.Getenv("WORKFORCE_DSH_SERVICE_TOKEN")),
		decisionService: configuredDecisionService,
		maps:            mapproviders.NewClient(os.Getenv("DSH_MAPS_BASE_URL")),
	}
}

func (s *protectedStoreServer) mediaClient() *media.Client {
	if s.media == nil {
		return nil
	}
	return s.media.Client()
}

type storeActorContextKeyType struct{}

func partnerRequestWithActor(r *http.Request, actor store.StoreActor) *http.Request {
	ctx := r.Context()
	if strings.TrimSpace(actor.OperatorContextID) != "" {
		ctx = partner.WithOperatorContext(ctx, actor.OperatorContextID)
	}
	surface := strings.TrimSpace(actor.SessionSurface)
	if surface == "" {
		surface = dshActorSurface(actor.Role)
	}
	ctx = partner.WithActorContext(ctx, actor.ID, surface)
	ctx = context.WithValue(ctx, "actor_phone", actor.PhoneE164)
	ctx = context.WithValue(ctx, storeActorContextKeyType{}, actor)
	return r.WithContext(ctx)
}

func (s *protectedStoreServer) ActorFromContext(ctx context.Context) (store.StoreActor, bool) {
	actor, ok := ctx.Value(storeActorContextKeyType{}).(store.StoreActor)
	return actor, ok
}

func dshActorSurface(role string) string {
	switch role {
	case "operator":
		return "control-panel"
	case "client":
		return "app-client"
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

func partnerRequestWithPartner(r *http.Request, actor store.StoreActor, partnerID string) *http.Request {
	ctx := partnerRequestWithActor(r, actor).Context()
	ctx = context.WithValue(ctx, "partner_id", partnerID)
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

func (s *protectedStoreServer) servePartnerPermissionHandler(
	w http.ResponseWriter,
	r *http.Request,
	handler http.HandlerFunc,
	action string,
) {
	actor, ok := s.requirePermission(w, r, "control-panel", action)
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
	storeID := strings.TrimSpace(r.URL.Query().Get("storeId"))
	partnerID := ""
	var err error
	if storeID != "" {
		row, _, resolveErr := store.ResolveActorStoreForID(r.Context(), s.db, actor, storeID)
		err = resolveErr
		if err == nil {
			partnerID = strings.TrimSpace(row.PartnerID)
			if partnerID == "" {
				err = store.ErrScopedStoreNotFound
			}
		}
	} else {
		partnerID, err = store.ResolveActorPartnerID(r.Context(), s.db, actor)
	}
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	handler(w, partnerRequestWithPartner(r, actor, partnerID))
}

func (s *protectedStoreServer) handleListPartnerDocuments(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListDocuments(s.db), PartnersPermissionRead)
}

func (s *protectedStoreServer) handleAddPartnerDocument(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleAddDocument(s.db), PartnersPermissionManage)
}

func (s *protectedStoreServer) handleListPartnerStores(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListPartnerStores(s.db), PartnersPermissionRead)
}

func (s *protectedStoreServer) handleListPartnerFieldVisits(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListFieldVisits(s.db), PartnersPermissionRead)
}

func (s *protectedStoreServer) handleListPartnerAudit(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleListAudit(s.db), PartnersPermissionRead)
}

func (s *protectedStoreServer) handleFieldUploadPartnerDocument(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldUploadDocument(s.db), "field")
}

func (s *protectedStoreServer) handleFieldListPartnerDocuments(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldListDocuments(s.db), "field")
}

func (s *protectedStoreServer) handleFieldListPartnerFieldVisits(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldListFieldVisits(s.db), "field")
}

func (s *protectedStoreServer) handleStoreContext(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "field", "captain")
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
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead)
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	listQuery, errMessage := store.ParseListQuery(r.URL.Query())
	if errMessage != "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", errMessage)
		return
	}
	result, err := store.ListAllStoresForOperatorContext(s.db, actor.OperatorContextID, listQuery)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load OperatorContext stores")
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}

func (s *protectedStoreServer) handleOperatorStoreDetail(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead)
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	row, err := store.GetStoreByIDInternalForOperatorContext(r.Context(), s.db, actor.OperatorContextID, r.PathValue("storeId"))
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"store": store.RowToDetail(*row)})
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
	row, err := store.GetStoreByIDInternalForOperatorContext(r.Context(), s.db, actor.OperatorContextID, storeID)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"storeId":        row.ID,
		"status":         row.Status,
		"deliveryModes":  row.DeliveryModes,
		"storeOpen":      string(row.Status) == "active",
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
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionManage)
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
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead)
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	if _, err := store.GetStoreByIDInternalForOperatorContext(r.Context(), s.db, actor.OperatorContextID, r.PathValue("storeId")); err != nil {
		s.writeStoreError(w, err)
		return
	}
	events, err := store.ListStoreAudit(r.Context(), s.db, r.PathValue("storeId"), 20)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load store audit")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": events})
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
	s.servePartnerSelfHandler(w, r, partner.HandleListPartnerScopes(s.db, s.identity))
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
			expectedSurface := dshActorSurface(role)
			if identity.SessionSurface != expectedSurface {
				continue
			}
			return store.StoreActor{
				ID:                identity.Subject,
				Role:              role,
				OperatorContextID: identity.OperatorContextID,
				SessionID:         identity.SessionID,
				SessionSurface:    identity.SessionSurface,
				PhoneE164:         identity.PhoneE164,
			}, true
		}
	}
	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor role cannot perform this action")
	return store.StoreActor{}, false
}

func (s *protectedStoreServer) withPermission(surface, action string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := s.requirePermission(w, r, surface, action)
		if !ok {
			return
		}
		ctx := partnerRequestWithActor(r, actor).Context()
		ctx = context.WithValue(ctx, "authorized_action", actor.AuthorizedAction)
		ctx = context.WithValue(ctx, "authorization_scope", actor.AuthorizationScope)
		next(w, r.WithContext(ctx))
	}
}

func (s *protectedStoreServer) requirePermission(
	w http.ResponseWriter,
	r *http.Request,
	surface string,
	action string,
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
	if surface != dshActorSurface("operator") || identity.SessionSurface != surface {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "control-panel session is required")
		return store.StoreActor{}, false
	}

	permissions, permissionErr := resolvedControlPanelPermissions(s, r, identity)
	if permissionErr != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "permission authority is unavailable")
		return store.StoreActor{}, false
	}
	for _, p := range permissions {
		if p.Service == "dsh" && p.Surface == surface && p.Action == action {
			scope := strings.TrimSpace(p.Scope)
			if scope == "" {
				continue
			}
			return store.StoreActor{
				ID:                 identity.Subject,
				Role:               controlPanelActorRole(identity),
				OperatorContextID:  identity.OperatorContextID,
				SessionID:          identity.SessionID,
				SessionSurface:     identity.SessionSurface,
				PhoneE164:          identity.PhoneE164,
				AuthorizedAction:   action,
				AuthorizationScope: scope,
			}, true
		}
	}
	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor lacks required permission")
	return store.StoreActor{}, false
}

func decodeProtectedJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

func (s *protectedStoreServer) writeActionResponse(w http.ResponseWriter, response store.StoreActionResponse, err error) {
	if err == nil {
		status := http.StatusOK
		if response.Replayed {
			w.Header().Set("Idempotent-Replayed", "true")
		}
		store.SendJSON(w, status, response)
		return
	}
	s.writeStoreError(w, err)
}

func (s *protectedStoreServer) writeStoreError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrAmbiguousStoreScope):
		store.SendError(w, http.StatusConflict, "STORE_SCOPE_REQUIRED", "an explicit store or partner scope is required")
	case errors.Is(err, store.ErrScopedStoreNotFound):
		store.SendError(w, http.StatusNotFound, "STORE_NOT_FOUND", "store was not found in actor scope")
	case errors.Is(err, store.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "store version changed; refresh and retry")
	case errors.Is(err, store.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different request")
	default:
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	}
}

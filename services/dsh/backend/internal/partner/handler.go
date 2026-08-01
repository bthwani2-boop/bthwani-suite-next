package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"dsh-api/internal/store"
)

// ─── JSON helpers (reuse store.SendJSON pattern) ───────────────────────────

func sendJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func sendError(w http.ResponseWriter, status int, code, message string) {
	sendJSON(w, status, map[string]string{"code": code, "message": message})
}

func correlationID(r *http.Request) string {
	if v := r.Header.Get("X-Correlation-ID"); v != "" {
		return v
	}
	return ""
}

func idempotencyKey(r *http.Request) string {
	return r.Header.Get("Idempotency-Key")
}

func actorFromContext(r *http.Request) (actorID, surface string) {
	actorID, _ = r.Context().Value("actor_id").(string)
	surface, _ = r.Context().Value("actor_surface").(string)
	return actorID, surface
}

func storeIDFromContext(r *http.Request) string {
	storeID, _ := r.Context().Value("store_id").(string)
	return storeID
}

func partnerIDFromPath(r *http.Request) string {
	return r.PathValue("partnerId")
}

func documentIDFromPath(r *http.Request) string {
	return r.PathValue("docId")
}

func visitIDFromPath(r *http.Request) string {
	return r.PathValue("visitId")
}

func versionFromQuery(r *http.Request) int {
	v, _ := strconv.Atoi(r.URL.Query().Get("version"))
	return v
}

// requireFieldOwnsPartner verifies the requesting field actor created the
// partner draft at partnerID. Returns false and writes the response if the
// partner does not exist or belongs to a different field actor.
func requireFieldOwnsPartner(w http.ResponseWriter, db *sql.DB, partnerID, actorID string) bool {
	p, err := GetPartner(db, partnerID)
	if errors.Is(err, ErrNotFound) {
		sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
		return false
	}
	if err != nil {
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify partner ownership")
		return false
	}
	if p.CreatedByActorID != actorID {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "this partner draft does not belong to you")
		return false
	}
	return true
}

// ─── Handlers ──────────────────────────────────────────────────────────────

func readinessHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		pid := partnerIDFromPath(r)
		p, err := GetPartner(db, pid)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get partner")
			return
		}
		total, approved, err := CountApprovedDocuments(db, pid)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to count documents")
			return
		}

		var hasStore bool
		var storeActive bool
		var storeServiceable bool
		var storePartnerReadinessReady bool
		var storeCatalogApproved bool
		var storeMarketingVisible bool
		var storeIsVisible bool

		linkedStore, err := store.GetStoreByPartnerID(db, pid)
		if err == nil && linkedStore != nil {
			hasStore = true
			storeActive = (linkedStore.Status == store.StatusActive)
			storeServiceable = (linkedStore.ServiceabilityStatus == store.ServiceabilityServiceable || linkedStore.ServiceabilityStatus == store.ServiceabilityLimited)
			storePartnerReadinessReady = (linkedStore.PartnerReadiness == "ready")
			storeCatalogApproved = (linkedStore.CatalogApprovalStatus == "approved")
			storeMarketingVisible = (linkedStore.MarketingVisibility == "visible")
			storeIsVisible = linkedStore.IsVisible
		}

		sendJSON(w, http.StatusOK, ComputeReadiness(
			p, total, approved,
			hasStore, storeActive, storeServiceable,
			storePartnerReadinessReady, storeCatalogApproved,
			storeMarketingVisible, storeIsVisible,
		))
	}
}

// GET /dsh/partners/{partnerId}/documents — operator, any partner
func HandleListDocuments(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		docs, err := ListDocuments(db, partnerIDFromPath(r))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list documents")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"documents": docs})
	}
}

// GET /dsh/field/partners/{partnerId}/documents — field, only its own draft
func HandleFieldListDocuments(db *sql.DB) http.HandlerFunc {
	inner := HandleListDocuments(db)
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		if !requireFieldOwnsPartner(w, db, partnerIDFromPath(r), actorID) {
			return
		}
		inner(w, r)
	}
}

// POST /dsh/partners/{partnerId}/documents/{documentId}/review
func HandleReviewDocument(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var input ReviewDocumentInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.ReviewedByActorID = actorID
		input.CorrelationID = correlationID(r)

		doc, rev, err := ReviewDocument(db, partnerIDFromPath(r), documentIDFromPath(r), input)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "document not found")
			return
		}
		if errors.Is(err, ErrInvalid) {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid review decision")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "review failed")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"document": doc, "review": rev})
	}
}

// GET /dsh/partners/{partnerId}/field-visits — operator, any partner
func HandleListFieldVisits(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		visits, err := ListFieldVisits(db, partnerIDFromPath(r))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list field visits")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"visits": visits})
	}
}

// GET /dsh/field/partners/{partnerId}/field-visits — field, only its own draft
func HandleFieldListFieldVisits(db *sql.DB) http.HandlerFunc {
	inner := HandleListFieldVisits(db)
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		if !requireFieldOwnsPartner(w, db, partnerIDFromPath(r), actorID) {
			return
		}
		inner(w, r)
	}
}

// GET /dsh/partners/{partnerId}/stores
func HandleListPartnerStores(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stores, err := ListPartnerStores(db, partnerIDFromPath(r))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner stores")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"stores": stores, "total": len(stores)})
	}
}

// GET /dsh/partners/{partnerId}/audit
func HandleListAudit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		events, err := ListActivationEvents(db, partnerIDFromPath(r))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list audit events")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"events": events})
	}
}

// ─── Field surface handlers ─────────────────────────────────────────────────

func uploadDocumentHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var input UploadDocumentInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.UploadedByActorID = actorID

		doc, err := UploadDocument(db, partnerIDFromPath(r), input)
		if errors.Is(err, ErrInvalid) {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload document")
			return
		}
		sendJSON(w, http.StatusCreated, doc)
	}
}

// POST /dsh/field/partners/{partnerId}/documents  — field uploads document to its own draft
func HandleFieldUploadDocument(db *sql.DB) http.HandlerFunc {
	inner := uploadDocumentHandler(db)
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		if !requireFieldOwnsPartner(w, db, partnerIDFromPath(r), actorID) {
			return
		}
		inner(w, r)
	}
}

// POST /dsh/operator/partners/{partnerId}/documents — operator adds a document to any partner
func HandleAddDocument(db *sql.DB) http.HandlerFunc {
	return uploadDocumentHandler(db)
}

// ─── Partner-self surface handler ──────────────────────────────────────────

// GET /dsh/partner/me  — partner reads their own profile
func HandlePartnerMe(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storeID := storeIDFromContext(r)
		if storeID == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "no store context")
			return
		}
		var partnerID sql.NullString
		if err := db.QueryRow(`SELECT partner_id FROM dsh_stores WHERE id = $1`, storeID).Scan(&partnerID); err != nil {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
			return
		}
		if !partnerID.Valid || partnerID.String == "" {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "no partner linked to this store")
			return
		}
		p, err := GetPartner(db, partnerID.String)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get partner")
			return
		}
		// Only expose fields the partner should see (no internal notes from CP)
		sendJSON(w, http.StatusOK, map[string]any{
			"id":               p.ID,
			"displayName":      p.DisplayName,
			"legalNameAr":      p.LegalNameAr,
			"category":         p.Category,
			"activationStatus": p.ActivationStatus,
			"primaryPhone":     p.PrimaryPhone,
			"email":            p.Email,
			"createdAt":        p.CreatedAt,
			"updatedAt":        p.UpdatedAt,
		})
	}
}

// ─── Store team, courier settings, coverage zones ──────────────────────────
// These are pure business handlers — no auth logic inside. Callers in
// protected_store.go verify the actor can access storeId (via
// store.ActorCanAccessStore) before invoking these.

// GET /dsh/partner/stores/{storeId}/team
func HandleGetStoreTeam(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		members, err := ListStoreTeamMembers(db, r.PathValue("storeId"))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list team members")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"members": members})
	}
}

// POST /dsh/partner/stores/{storeId}/team/invites
func HandleInviteStoreTeamMember(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var input InviteTeamMemberInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.InvitedByActorID = actorID
		if err := InviteStoreTeamMember(db, r.PathValue("storeId"), input); err != nil {
			if errors.Is(err, ErrInvalid) {
				sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
				return
			}
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to invite team member")
			return
		}
		sendJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// GET /dsh/partner/invites
func HandleListInvites(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorPhone, ok := r.Context().Value("actor_phone").(string)
		if !ok || actorPhone == "" {
			sendJSON(w, http.StatusOK, map[string]any{"invites": []StoreTeamMember{}})
			return
		}
		invites, err := ListInvitesForPhone(db, actorPhone)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list invites")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"invites": invites})
	}
}

// POST /dsh/partner/invites/{inviteId}/accept
func HandleAcceptInvite(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		actorPhone, ok := r.Context().Value("actor_phone").(string)
		if !ok || actorPhone == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "actor has no bound phone number")
			return
		}
		err := AcceptInvite(db, r.PathValue("inviteId"), actorID, actorPhone)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "invite not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to accept invite")
			return
		}
		sendJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// POST /dsh/partner/invites/{inviteId}/reject
func HandleRejectInvite(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		actorPhone, ok := r.Context().Value("actor_phone").(string)
		if !ok || actorPhone == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "actor has no bound phone number")
			return
		}
		err := RejectInvite(db, r.PathValue("inviteId"), actorID, actorPhone)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "invite not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to reject invite")
			return
		}
		sendJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// GET /dsh/partner/stores/{storeId}/courier-settings
func HandleGetStoreCourierSettings(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		settings, err := GetStoreCourierSettings(db, r.PathValue("storeId"))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get courier settings")
			return
		}
		sendJSON(w, http.StatusOK, settings)
	}
}

// PUT /dsh/partner/stores/{storeId}/courier-settings
func HandleUpdateStoreCourierSettings(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input StoreCourierSettings
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		settings, err := UpsertStoreCourierSettings(db, r.PathValue("storeId"), input)
		if errors.Is(err, ErrInvalid) {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update courier settings")
			return
		}
		sendJSON(w, http.StatusOK, settings)
	}
}

// GET /dsh/partner/stores/{storeId}/coverage-zones
func HandleListStoreCoverageZones(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		zones, err := ListStoreCoverageZones(db, r.PathValue("storeId"))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list coverage zones")
			return
		}
		sendJSON(w, http.StatusOK, zones)
	}
}

// GET /dsh/partner/scopes — resolves the caller's own default store to find
// their partner, then lists all of that partner's stores as scopes.
func HandleListPartnerScopes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := OperatorContextIDFromContext(r.Context())
		if !ok {
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
			return
		}
		storeID := storeIDFromContext(r)
		if storeID == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "no store context")
			return
		}
		actorID, _ := actorFromContext(r)
		var partnerID sql.NullString
		if err := db.QueryRow(`SELECT partner_id FROM dsh_stores WHERE id = $1 AND operator_context_id = $2`, storeID, operatorContextID).Scan(&partnerID); err != nil {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
			return
		}
		if !partnerID.Valid || partnerID.String == "" {
			sendJSON(w, http.StatusOK, map[string]any{"scopes": []OperationalScope{}})
			return
		}
		scopes, err := ListPartnerScopesForActorForOperatorContext(db, operatorContextID, partnerID.String, actorID)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner scopes")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"scopes": scopes})
	}
}

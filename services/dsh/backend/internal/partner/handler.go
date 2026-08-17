package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"dsh-api/internal/auth"
	"dsh-api/internal/store"
)

// â”€â”€â”€ JSON helpers (reuse store.SendJSON pattern) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
	actorID, _ = r.Context().Value(actorIDKey).(string)
	surface, _ = r.Context().Value(actorSurfaceKey).(string)
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

// â”€â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
		linkedStore, err := store.GetStoreByPartnerID(db, pid)
		if errors.Is(err, store.ErrAmbiguousPartnerStores) {
			sendError(w, http.StatusConflict, "AMBIGUOUS_STORE", "partner has multiple stores; readiness requires an explicit store")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve linked store")
			return
		}
		if err == nil && linkedStore != nil {
			hasStore = true
		}

		readiness := ComputeReadiness(
			p, total, approved,
			hasStore,
			func() store.PublicationDecision {
				if linkedStore == nil {
					return ""
				}
				return linkedStore.PublicationDecision
			}(),
			func() []string {
				if linkedStore == nil {
					return nil
				}
				return linkedStore.BlockingReasonCodes
			}(),
		)
		sendJSON(w, http.StatusOK, readiness)
	}
}

// GET /dsh/partners/{partnerId}/documents â€” operator, any partner
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

// GET /dsh/field/partners/{partnerId}/documents â€” field, only its own draft
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

// GET /dsh/partners/{partnerId}/field-visits â€” operator, any partner
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

// GET /dsh/field/partners/{partnerId}/field-visits â€” field, only its own draft
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

// â”€â”€â”€ Field surface handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// POST /dsh/field/partners/{partnerId}/documents  â€” field uploads document to its own draft
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

// POST /dsh/operator/partners/{partnerId}/documents â€” operator adds a document to any partner
func HandleAddDocument(db *sql.DB) http.HandlerFunc {
	return uploadDocumentHandler(db)
}

// â”€â”€â”€ Partner-self surface handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /dsh/partner/me  â€” partner reads their own profile
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

// â”€â”€â”€ Store team, courier settings, coverage zones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// GET /dsh/partner/scopes â€” resolves the caller's own default store to find
// their partner, then lists all of that partner's stores as scopes.
func HandleListPartnerScopes(db *sql.DB, authClient *auth.Client) http.HandlerFunc {
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

		bundles, err := authClient.FetchPartnerPermissionBundles(r.Context())
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve authoritative partner permission bundles")
			return
		}
		resolver := make(map[string][]string)
		for _, bundle := range bundles {
			resolver[bundle.Code] = bundle.Actions
		}

		scopes, err := ListPartnerScopesForActorForOperatorContext(db, operatorContextID, partnerID.String, actorID, resolver)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner scopes")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"scopes": scopes})
	}
}

package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
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
	actorID = r.Header.Get("X-Actor-ID")
	surface = r.Header.Get("X-Actor-Surface")
	if surface == "" {
		surface = "control-panel"
	}
	return actorID, surface
}

func partnerIDFromPath(r *http.Request) string {
	return r.PathValue("partnerId")
}

func documentIDFromPath(r *http.Request) string {
	return r.PathValue("documentId")
}

func visitIDFromPath(r *http.Request) string {
	return r.PathValue("visitId")
}

func versionFromQuery(r *http.Request) int {
	v, _ := strconv.Atoi(r.URL.Query().Get("version"))
	return v
}

// ─── Handlers ──────────────────────────────────────────────────────────────

// POST /dsh/partners  — create partner (control-panel or field)
func HandleCreatePartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, surface := actorFromContext(r)
		var input CreatePartnerInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.CreatedByActorID = actorID
		input.CreatedBySurface = surface
		p, err := CreatePartner(db, input)
		if errors.Is(err, ErrInvalid) {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
		if errors.Is(err, ErrConflict) {
			sendError(w, http.StatusConflict, "CONFLICT", "partner with this legal identity already exists")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create partner")
			return
		}
		sendJSON(w, http.StatusCreated, p)
	}
}

// GET /dsh/partners  — list partners (operator)
func HandleListPartners(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := PartnerListQuery{
			ActivationStatus: r.URL.Query().Get("status"),
			Limit:            20,
			Offset:           0,
		}
		if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 {
			q.Limit = l
		}
		if o, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && o >= 0 {
			q.Offset = o
		}
		list, total, err := ListPartners(db, q)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partners")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{
			"partners": list,
			"pagination": map[string]int{
				"total":  total,
				"limit":  q.Limit,
				"offset": q.Offset,
			},
		})
	}
}

// GET /dsh/partners/{partnerId}  — get partner detail (operator)
func HandleGetPartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		p, err := GetPartner(db, partnerIDFromPath(r))
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get partner")
			return
		}
		sendJSON(w, http.StatusOK, p)
	}
}

// PATCH /dsh/partners/{partnerId}  — update partner (operator)
func HandleUpdatePartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpdatePartnerInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		p, err := UpdatePartner(db, partnerIDFromPath(r), input, versionFromQuery(r))
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update partner")
			return
		}
		sendJSON(w, http.StatusOK, p)
	}
}

// GET /dsh/partners/{partnerId}/readiness
func HandleGetReadiness(db *sql.DB) http.HandlerFunc {
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
		storeCount, err := CountStores(db, pid)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to count stores")
			return
		}
		sendJSON(w, http.StatusOK, ComputeReadiness(p, total, approved, storeCount))
	}
}

// POST /dsh/partners/{partnerId}/activation-transitions
func HandleActivationTransition(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, surface := actorFromContext(r)
		var input TransitionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.ActorID = actorID
		input.ActorSurface = surface
		input.CorrelationID = correlationID(r)
		input.IdempotencyKey = idempotencyKey(r)

		updated, evt, err := TransitionStatus(db, partnerIDFromPath(r), input, versionFromQuery(r))
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if errors.Is(err, ErrInvalidTransition) {
			sendError(w, http.StatusUnprocessableEntity, "INVALID_TRANSITION",
				"transition not allowed from current status")
			return
		}
		if errors.Is(err, ErrConflict) {
			sendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner was modified concurrently")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "transition failed")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{
			"partner": updated,
			"event":   evt,
		})
	}
}

// GET /dsh/partners/{partnerId}/documents
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

// GET /dsh/partners/{partnerId}/field-visits
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

// POST /dsh/field/partners/drafts  — field creates partner draft
func HandleFieldCreateDraft(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var input CreatePartnerInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.CreatedByActorID = actorID
		input.CreatedBySurface = "app-field"
		p, err := CreatePartner(db, input)
		if errors.Is(err, ErrInvalid) {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
		if errors.Is(err, ErrConflict) {
			sendError(w, http.StatusConflict, "CONFLICT", "partner with this legal identity already exists")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create draft")
			return
		}
		sendJSON(w, http.StatusCreated, p)
	}
}

// GET /dsh/field/partners/{partnerId}  — field reads partner draft
func HandleFieldGetPartner(db *sql.DB) http.HandlerFunc {
	return HandleGetPartner(db)
}

// PATCH /dsh/field/partners/{partnerId}  — field updates allowed fields
func HandleFieldUpdatePartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input UpdatePartnerInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		p, err := UpdatePartner(db, partnerIDFromPath(r), input, versionFromQuery(r))
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update partner")
			return
		}
		sendJSON(w, http.StatusOK, p)
	}
}

// POST /dsh/field/partners/{partnerId}/documents  — field uploads document
func HandleFieldUploadDocument(db *sql.DB) http.HandlerFunc {
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

// POST /dsh/field/partners/{partnerId}/visits  — field creates partner-level visit
func HandleFieldCreateVisit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var input CreateFieldVisitInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.PartnerID = partnerIDFromPath(r)
		input.FieldActorID = actorID

		visit, err := CreateFieldVisit(db, input)
		if errors.Is(err, ErrInvalid) {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create visit")
			return
		}
		sendJSON(w, http.StatusCreated, visit)
	}
}

// POST /dsh/field/partners/{partnerId}/submit  — field submits for CP review
// This triggers a draft → submitted transition.
func HandleFieldSubmitPartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		var body struct {
			Reason string `json:"reason"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)

		input := TransitionInput{
			ToStatus:      StatusSubmitted,
			Reason:        body.Reason,
			ActorID:       actorID,
			ActorSurface:  "app-field",
			CorrelationID: correlationID(r),
			IdempotencyKey: idempotencyKey(r),
		}

		updated, evt, err := TransitionStatus(db, partnerIDFromPath(r), input, 0)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if errors.Is(err, ErrInvalidTransition) {
			sendError(w, http.StatusUnprocessableEntity, "INVALID_TRANSITION",
				"partner cannot be submitted from current status — must be draft or field_visit_scheduled")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "submission failed")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{
			"partner": updated,
			"event":   evt,
		})
	}
}

// ─── Partner-self surface handler ──────────────────────────────────────────

// GET /dsh/partner/me  — partner reads their own profile
func HandlePartnerMe(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// partner's store_id is bound via auth context
		storeID := r.Header.Get("X-Store-ID")
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

// GET /dsh/partner/me/readiness
func HandlePartnerMeReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storeID := r.Header.Get("X-Store-ID")
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
		pid := partnerID.String
		p, err := GetPartner(db, pid)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get partner")
			return
		}
		total, approved, err := CountApprovedDocuments(db, pid)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to count documents")
			return
		}
		storeCount, err := CountStores(db, pid)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to count stores")
			return
		}
		sendJSON(w, http.StatusOK, ComputeReadiness(p, total, approved, storeCount))
	}
}

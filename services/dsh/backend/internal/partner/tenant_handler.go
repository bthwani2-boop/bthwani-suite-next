package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
)

func requireTenantContext(w http.ResponseWriter, r *http.Request) (string, bool) {
	tenantID, ok := TenantIDFromContext(r.Context())
	if !ok {
		sendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", "trusted tenant context is required")
		return "", false
	}
	return tenantID, true
}

func parsePartnerListQuery(r *http.Request, actorID string) PartnerListQuery {
	query := PartnerListQuery{
		ActivationStatus: r.URL.Query().Get("status"),
		CreatedByActorID: actorID,
		Limit:            20,
		Offset:           0,
	}
	if limit, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && limit > 0 {
		query.Limit = limit
	}
	if offset, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && offset >= 0 {
		query.Offset = offset
	}
	return query
}

func writeTenantPartnerCreateResult(w http.ResponseWriter, partner Partner, err error, draft bool) {
	switch {
	case errors.Is(err, ErrTenantContextRequired):
		sendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", err.Error())
	case errors.Is(err, ErrInvalid):
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, ErrConflict):
		sendError(w, http.StatusConflict, "CONFLICT", "partner with this legal identity already exists in the current tenant")
	case err != nil:
		message := "failed to create partner"
		if draft {
			message = "failed to create draft"
		}
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", message)
	default:
		sendJSON(w, http.StatusCreated, partner)
	}
}

// HandleTenantListPartners lists only partners owned by the authenticated
// tenant. A tenant selector supplied by the browser is intentionally ignored.
func HandleTenantListPartners(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := requireTenantContext(w, r)
		if !ok {
			return
		}
		query := parsePartnerListQuery(r, "")
		partners, total, err := ListPartnersForTenant(db, tenantID, query)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partners")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{
			"partners": partners,
			"pagination": map[string]int{
				"total": total,
				"limit": query.Limit,
				"offset": query.Offset,
			},
		})
	}
}

func HandleTenantCreatePartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := requireTenantContext(w, r)
		if !ok {
			return
		}
		actorID, surface := actorFromContext(r)
		var input CreatePartnerInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.CreatedByActorID = actorID
		input.CreatedBySurface = surface
		partner, err := CreatePartnerForTenant(db, tenantID, input)
		writeTenantPartnerCreateResult(w, partner, err, false)
	}
}

func HandleTenantListFieldPartnerDrafts(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := requireTenantContext(w, r)
		if !ok {
			return
		}
		actorID, _ := actorFromContext(r)
		query := parsePartnerListQuery(r, actorID)
		partners, total, err := ListPartnersForTenant(db, tenantID, query)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list field partner drafts")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{
			"partners": partners,
			"pagination": map[string]int{
				"total": total,
				"limit": query.Limit,
				"offset": query.Offset,
			},
		})
	}
}

func HandleTenantFieldCreateDraft(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := requireTenantContext(w, r)
		if !ok {
			return
		}
		actorID, _ := actorFromContext(r)
		var input CreatePartnerInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.CreatedByActorID = actorID
		input.CreatedBySurface = "app-field"
		partner, err := CreatePartnerForTenant(db, tenantID, input)
		writeTenantPartnerCreateResult(w, partner, err, true)
	}
}

func HandleTenantLinkPartnerStore(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := requireTenantContext(w, r)
		if !ok {
			return
		}
		actorID, _ := actorFromContext(r)
		var input struct {
			StoreID string `json:"storeId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		stores, err := LinkPartnerStoreForTenant(db, tenantID, partnerIDFromPath(r), input.StoreID, actorID)
		switch {
		case errors.Is(err, ErrInvalid):
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "storeId is required")
		case errors.Is(err, ErrNotFound):
			// Do not reveal whether an identifier exists in another tenant.
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner or store not found")
		case errors.Is(err, ErrTenantContextRequired):
			sendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", err.Error())
		case err != nil:
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to link partner store")
		default:
			sendJSON(w, http.StatusOK, map[string]any{"stores": stores, "total": len(stores)})
		}
	}
}

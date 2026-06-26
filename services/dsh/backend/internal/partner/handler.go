package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"dsh-api/internal/store"
)

func HandleListPartners(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := r.URL.Query().Get("status")
		category := r.URL.Query().Get("category")
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
		if limit <= 0 {
			limit = 50
		}

		partners, total, err := List(db, ListFilter{Status: status, Category: category, Limit: limit, Offset: offset})
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"partners": partners, "total": total})
	}
}

func HandleCreatePartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in CreateInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		p, err := Create(db, in)
		if err != nil {
			if errors.Is(err, ErrInvalid) {
				store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
				return
			}
			if errors.Is(err, ErrConflict) {
				store.SendError(w, http.StatusConflict, "CONFLICT", "partner with this legal identity already exists")
				return
			}
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusCreated, p)
	}
}

func HandleGetPartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		p, err := GetByID(db, partnerID)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
				return
			}
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusOK, p)
	}
}

func HandleTransitionPartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		var req struct {
			TargetStatus  string `json:"targetStatus"`
			Reason        string `json:"reason"`
			ActorID       string `json:"actorId"`
			ActorSurface  string `json:"actorSurface"`
			CorrelationID string `json:"correlationId"`
			Version       int    `json:"version"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		if req.TargetStatus == "" {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "targetStatus is required")
			return
		}
		actorSurface := req.ActorSurface
		if actorSurface == "" {
			actorSurface = "system"
		}
		p, err := Transition(db, partnerID, TransitionInput{
			TargetStatus:  req.TargetStatus,
			ActorID:       req.ActorID,
			ActorSurface:  actorSurface,
			Reason:        req.Reason,
			CorrelationID: req.CorrelationID,
			Version:       req.Version,
		})
		if err != nil {
			switch {
			case errors.Is(err, ErrNotFound):
				store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			case errors.Is(err, ErrForbidden):
				store.SendError(w, http.StatusUnprocessableEntity, "INVALID_TRANSITION", err.Error())
			case errors.Is(err, ErrVersionConflict):
				store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", err.Error())
			default:
				store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			}
			return
		}
		store.SendJSON(w, http.StatusOK, p)
	}
}

func HandleListPartnerDocuments(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		docs, err := ListDocuments(db, partnerID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"documents": docs, "total": len(docs)})
	}
}

func HandleAddDocument(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		var in DocumentInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		doc, err := AddDocument(db, partnerID, in)
		if err != nil {
			if errors.Is(err, ErrInvalid) {
				store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
				return
			}
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusCreated, doc)
	}
}

func HandleReviewDocument(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		docID := r.PathValue("docId")
		var in ReviewDocInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		doc, err := ReviewDocument(db, partnerID, docID, in)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				store.SendError(w, http.StatusNotFound, "NOT_FOUND", "document not found")
				return
			}
			if errors.Is(err, ErrInvalid) {
				store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
				return
			}
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusOK, doc)
	}
}

func HandleListPartnerStores(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		stores, err := ListPartnerStores(db, partnerID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"stores": stores, "total": len(stores)})
	}
}

func HandleLinkStore(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		var req struct {
			StoreID string `json:"storeId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		if req.StoreID == "" {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "storeId is required")
			return
		}
		if err := LinkStore(db, partnerID, req.StoreID); err != nil {
			if errors.Is(err, ErrNotFound) {
				store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
				return
			}
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		stores, _ := ListPartnerStores(db, partnerID)
		store.SendJSON(w, http.StatusOK, map[string]any{"stores": stores, "total": len(stores)})
	}
}

func HandleGetReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		readiness, err := GetReadiness(db, partnerID)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
				return
			}
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusOK, readiness)
	}
}

func HandleListPartnerEvents(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		events, err := ListEvents(db, partnerID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"events": events, "total": len(events)})
	}
}

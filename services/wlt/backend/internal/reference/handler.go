package reference

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/shared"
)

func HandleGetPaymentStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID := r.URL.Query().Get("orderId")
		if orderID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId query parameter is required")
			return
		}
		ref, err := GetPaymentStatusRef(r.Context(), db, orderID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment status reference not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reference": ref})
	}
}

func HandleGetSettlementStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID := r.URL.Query().Get("orderId")
		if orderID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId query parameter is required")
			return
		}
		ref, err := GetSettlementStatusRef(r.Context(), db, orderID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "settlement status reference not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reference": ref})
	}
}

func HandleGetRefundStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID := r.URL.Query().Get("orderId")
		if orderID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId query parameter is required")
			return
		}
		ref, err := GetRefundStatusRef(r.Context(), db, orderID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund status reference not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reference": ref})
	}
}

func HandleGetWalletStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID := r.URL.Query().Get("actorId")
		actorType := r.URL.Query().Get("actorType")
		if actorID == "" || actorType == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorId and actorType query parameters are required")
			return
		}
		ref, err := GetWalletStatusRef(r.Context(), db, actorID, actorType)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "wallet status reference not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reference": ref})
	}
}

func HandleGetFieldCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.URL.Query().Get("partnerId")
		if partnerID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId query parameter is required")
			return
		}
		ref, err := GetFieldCommissionRef(r.Context(), db, partnerID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "field commission reference not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reference": ref})
	}
}

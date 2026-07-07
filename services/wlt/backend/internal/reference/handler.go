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
			shared.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "orderId is required")
			return
		}

		ref, err := GetPaymentStatusRef(db, orderID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "no payment status reference for orderId: "+orderID)
			return
		}

		shared.SendJSON(w, http.StatusOK, map[string]interface{}{"reference": ref})
	}
}

func HandleGetSettlementStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID := r.URL.Query().Get("orderId")
		if orderID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "orderId is required")
			return
		}

		ref, err := GetSettlementStatusRef(db, orderID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "no settlement status reference for orderId: "+orderID)
			return
		}

		shared.SendJSON(w, http.StatusOK, map[string]interface{}{"reference": ref})
	}
}

func HandleGetRefundStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orderID := r.URL.Query().Get("orderId")
		if orderID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "orderId is required")
			return
		}

		ref, err := GetRefundStatusRef(db, orderID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "no refund status reference for orderId: "+orderID)
			return
		}

		shared.SendJSON(w, http.StatusOK, map[string]interface{}{"reference": ref})
	}
}

func HandleGetWalletStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID := r.URL.Query().Get("actorId")
		actorType := r.URL.Query().Get("actorType")
		if actorID == "" || actorType == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "actorId and actorType are required")
			return
		}

		switch actorType {
		case "client", "partner", "captain", "field":
		default:
			shared.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "actorType must be one of: client, partner, captain, field")
			return
		}

		ref, err := GetWalletStatusRef(db, actorID, actorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "no wallet reference for actorId: "+actorID)
			return
		}

		shared.SendJSON(w, http.StatusOK, map[string]interface{}{"reference": ref})
	}
}

func HandleGetFieldCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.URL.Query().Get("partnerId")
		if partnerID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "partnerId is required")
			return
		}

		ref, err := GetFieldCommissionRef(db, partnerID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		if ref == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "no field commission reference for partnerId: "+partnerID)
			return
		}

		shared.SendJSON(w, http.StatusOK, map[string]interface{}{"reference": ref})
	}
}


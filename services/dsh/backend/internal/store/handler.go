package store

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
)

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func SendJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func SendError(w http.ResponseWriter, status int, code, message string) {
	SendJSON(w, status, ApiError{Code: code, Message: message})
}

func HandleListStores(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()

		limitStr := q.Get("limit")
		offsetStr := q.Get("offset")

		limit := 20
		offset := 0
		var err error

		if limitStr != "" {
			limit, err = strconv.Atoi(limitStr)
			if err != nil {
				SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "limit and offset must be integers")
				return
			}
		}

		if offsetStr != "" {
			offset, err = strconv.Atoi(offsetStr)
			if err != nil {
				SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "limit and offset must be integers")
				return
			}
		}

		var isVisible *bool
		isVisibleStr := q.Get("isVisible")
		if isVisibleStr == "true" {
			v := true
			isVisible = &v
		} else if isVisibleStr == "false" {
			v := false
			isVisible = &v
		}

		status := DshStoreStatus(q.Get("status"))

		// Validate query params
		if limit < 1 || limit > 100 {
			SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "limit must be between 1 and 100")
			return
		}
		if offset < 0 {
			SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "offset must be >= 0")
			return
		}
		if status != "" {
			if status != StatusActive && status != StatusInactive && status != StatusTemporarilyClosed && status != StatusUnavailable {
				SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "invalid status: "+string(status))
				return
			}
		}

		listQuery := DshStoreListQuery{
			CityCode:        q.Get("cityCode"),
			ServiceAreaCode: q.Get("serviceAreaCode"),
			Status:          status,
			IsVisible:       isVisible,
			Limit:           limit,
			Offset:          offset,
		}

		result, err := ListStores(db, listQuery)
		if err != nil {
			SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}

		SendJSON(w, http.StatusOK, result)
	}
}

func HandleGetStore(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storeID := r.PathValue("storeId")
		if storeID == "" {
			SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "storeId is required")
			return
		}

		row, err := GetStoreByID(db, storeID)
		if err != nil {
			SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}

		if row == nil {
			SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found: "+storeID)
			return
		}

		SendJSON(w, http.StatusOK, map[string]interface{}{
			"store": RowToDetail(*row),
		})
	}
}

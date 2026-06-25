package homediscovery

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

func HandleHomeDiscovery(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		_ = ctx

		cityCode := r.URL.Query().Get("cityCode")
		serviceAreaCode := r.URL.Query().Get("serviceAreaCode")
		limit := 10
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed >= 1 && parsed <= 50 {
				limit = parsed
			}
		}

		query := HomeDiscoveryQuery{
			CityCode:        cityCode,
			ServiceAreaCode: serviceAreaCode,
			Limit:           limit,
		}

		banners, err := ListBanners(db)
		if err != nil {
			sendError(w, 503, "BANNERS_UNAVAILABLE", "banners unavailable")
			return
		}

		promos, err := ListPromos(db)
		if err != nil {
			sendError(w, 503, "PROMOS_UNAVAILABLE", "promos unavailable")
			return
		}

		categories, err := ListCategories(db)
		if err != nil {
			sendError(w, 503, "CATEGORIES_UNAVAILABLE", "categories unavailable")
			return
		}

		stores, total, err := ListHomeStores(db, query)
		if err != nil {
			sendError(w, 503, "STORES_UNAVAILABLE", "stores unavailable")
			return
		}

		result := map[string]interface{}{
			"banners":     banners,
			"promos":      promos,
			"filters":     DefaultFilters(),
			"categories":  categories,
			"stores":      stores,
			"pagination":  HomePagination{Limit: limit, Offset: 0, Total: total},
			"generatedAt": time.Now().UTC().Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result) //nolint:errcheck
	}
}

func sendError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"code": code, "message": message}) //nolint:errcheck
}

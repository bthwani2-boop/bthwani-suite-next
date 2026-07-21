package homediscovery

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func HandleHomeDiscovery(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		cityCode := strings.TrimSpace(r.URL.Query().Get("cityCode"))
		serviceAreaCode := strings.TrimSpace(r.URL.Query().Get("serviceAreaCode"))
		audienceSegment := strings.TrimSpace(r.URL.Query().Get("audienceSegment"))
		if audienceSegment == "" {
			audienceSegment = "guest"
		}
		if audienceSegment != "guest" && audienceSegment != "authenticated" {
			sendError(w, http.StatusBadRequest, "INVALID_AUDIENCE_SEGMENT", "invalid audience segment")
			return
		}
		limit := 10
		if l := r.URL.Query().Get("limit"); l != "" {
			parsed, err := strconv.Atoi(l)
			if err != nil || parsed < 1 || parsed > 50 {
				sendError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be between 1 and 50")
				return
			}
			limit = parsed
		}

		query := HomeDiscoveryQuery{
			CityCode:        cityCode,
			ServiceAreaCode: serviceAreaCode,
			AudienceSegment: audienceSegment,
			Limit:           limit,
		}

		banners, err := ListBanners(ctx, db, query)
		if err != nil {
			sendError(w, http.StatusServiceUnavailable, "BANNERS_UNAVAILABLE", "banners unavailable")
			return
		}

		promos, err := ListPromos(ctx, db, query)
		if err != nil {
			sendError(w, http.StatusServiceUnavailable, "PROMOS_UNAVAILABLE", "promos unavailable")
			return
		}

		categories, err := ListCategories(ctx, db)
		if err != nil {
			sendError(w, http.StatusServiceUnavailable, "CATEGORIES_UNAVAILABLE", "categories unavailable")
			return
		}

		stores, total, err := ListHomeStores(ctx, db, query)
		if err != nil {
			sendError(w, http.StatusServiceUnavailable, "STORES_UNAVAILABLE", "stores unavailable")
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

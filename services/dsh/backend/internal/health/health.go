package health

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"dsh-api/internal/store"
)

type HealthResponse struct {
	Service   string `json:"service"`
	Status    string `json:"status"`
	CheckedAt string `json:"checkedAt"`
}

type ReadinessResponse struct {
	Service      string            `json:"service"`
	Status       string            `json:"status"`
	Dependencies map[string]string `json:"dependencies"`
	CheckedAt    string            `json:"checkedAt"`
}

func HandleHealth(w http.ResponseWriter, r *http.Request) {
	resp := HealthResponse{
		Service:   "dsh",
		Status:    "healthy",
		CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	store.SendJSON(w, http.StatusOK, resp)
}

func HandleReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "ready"
		err := db.Ping()
		if err != nil {
			dbStatus = "down"
		}
		wltBaseURLStatus := configuredStatus(os.Getenv("DSH_WLT_BASE_URL"))
		wltTokenStatus := configuredStatus(os.Getenv("WLT_DSH_SERVICE_TOKEN"))

		overallStatus := "ready"
		httpStatus := http.StatusOK
		if dbStatus == "down" || wltBaseURLStatus != "configured" || wltTokenStatus != "configured" {
			overallStatus = "not_ready"
			httpStatus = http.StatusServiceUnavailable
		}

		resp := ReadinessResponse{
			Service: "dsh",
			Status:  overallStatus,
			Dependencies: map[string]string{
				"postgres":          dbStatus,
				"wlt_base_url":      wltBaseURLStatus,
				"wlt_service_token": wltTokenStatus,
			},
			CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}

		store.SendJSON(w, httpStatus, resp)
	}
}

func configuredStatus(value string) string {
	if value == "" {
		return "missing"
	}
	return "configured"
}

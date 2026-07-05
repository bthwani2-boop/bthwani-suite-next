package health

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"wlt-api/internal/shared"
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
		Service:   "wlt",
		Status:    "healthy",
		CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	shared.SendJSON(w, http.StatusOK, resp)
}

func HandleReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "ready"
		err := db.Ping()
		if err != nil {
			dbStatus = "down"
		}
		dshCallbackBaseURLStatus := configuredStatus(os.Getenv("WLT_DSH_BASE_URL"))
		dshCallbackTokenStatus := configuredStatus(os.Getenv("DSH_WLT_SERVICE_TOKEN"))

		overallStatus := "ready"
		httpStatus := http.StatusOK
		if dbStatus == "down" || dshCallbackBaseURLStatus != "configured" || dshCallbackTokenStatus != "configured" {
			overallStatus = "not_ready"
			httpStatus = http.StatusServiceUnavailable
		}

		resp := ReadinessResponse{
			Service: "wlt",
			Status:  overallStatus,
			Dependencies: map[string]string{
				"postgres":                   dbStatus,
				"dsh_callback_base_url":      dshCallbackBaseURLStatus,
				"dsh_callback_service_token": dshCallbackTokenStatus,
			},
			CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}

		shared.SendJSON(w, httpStatus, resp)
	}
}

func configuredStatus(value string) string {
	if value == "" {
		return "missing"
	}
	return "configured"
}

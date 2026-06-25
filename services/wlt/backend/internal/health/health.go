package health

import (
	"database/sql"
	"net/http"
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

		overallStatus := "ready"
		httpStatus := http.StatusOK
		if dbStatus == "down" {
			overallStatus = "not_ready"
			httpStatus = http.StatusServiceUnavailable
		}

		resp := ReadinessResponse{
			Service: "wlt",
			Status:  overallStatus,
			Dependencies: map[string]string{
				"postgres": dbStatus,
			},
			CheckedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}

		shared.SendJSON(w, httpStatus, resp)
	}
}

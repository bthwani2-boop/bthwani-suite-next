package http

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"dsh-api/internal/auth"
	"dsh-api/internal/dispatch"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func RegisterOperationsIntelligenceRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("POST /dsh/internal/workforce/availability-projections", handleWorkforceAvailabilityProjection(db))
	mux.HandleFunc("GET /dsh/operator/dispatch/capacity-forecast", protected.handleGetServiceAreaCapacityForecast)
	mux.HandleFunc("PUT /dsh/operator/dispatch/capacity-policies/{serviceAreaCode}", protected.handleUpsertServiceAreaCapacityPolicy)
	mux.HandleFunc("GET /dsh/operator/dispatch/heatmap", protected.handleGetOperationsHeatmap)
}

func handleWorkforceAvailabilityProjection(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !store.RequireServiceCaller(w, r, "DSH_WORKFORCE_SERVICE_TOKEN", "workforce") {
			return
		}
		var input dispatch.ProviderAvailabilityProjectionInput
		if !decodeProtectedJSON(w, r, &input) {
			return
		}
		projection, err := dispatch.UpsertProviderAvailabilityProjection(r.Context(), db, input)
		if err != nil {
			writeGovernedDispatchError(w, err)
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"availabilityProjection": projection})
	}
}

func (s *protectedStoreServer) handleGetServiceAreaCapacityForecast(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator"); !ok {
		return
	}
	forecast, err := dispatch.GetServiceAreaCapacityForecast(
		r.Context(), s.db, r.URL.Query().Get("operatorContextId"),
		r.URL.Query().Get("serviceAreaCode"), time.Now().UTC(),
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityForecast": forecast})
}

func (s *protectedStoreServer) handleUpsertServiceAreaCapacityPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var input dispatch.UpsertServiceAreaCapacityPolicyInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.ServiceAreaCode = r.PathValue("serviceAreaCode")
	input.UpdatedBy = actor.ID
	policy, err := dispatch.UpsertServiceAreaCapacityPolicy(r.Context(), s.db, input)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"capacityPolicy": policy})
}

func (s *protectedStoreServer) handleGetOperationsHeatmap(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator"); !ok {
		return
	}
	cells, err := dispatch.GetOperationsHeatmap(
		r.Context(), s.db, r.URL.Query().Get("operatorContextId"),
		r.URL.Query().Get("serviceAreaCode"), time.Now().UTC(),
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"cells": cells, "totalCells": len(cells)})
}

type availabilityDispatchBody struct {
	OperatorContextID  string `json:"operatorContextId"`
	CaptainID string `json:"captainId"`
}

func unavailableCaptainForRequest(r *http.Request, db *sql.DB) (bool, string, error) {
	path := r.URL.Path
	if r.Method != http.MethodPost {
		return false, "", nil
	}
	if path == "/dsh/operator/dispatch/assignments" || (strings.HasPrefix(path, "/dsh/operator/dispatch/assignments/") && strings.HasSuffix(path, "/reassign")) {
		payload, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, 128*1024))
		if err != nil {
			return false, "", nil
		}
		r.Body = io.NopCloser(bytes.NewReader(payload))
		var body availabilityDispatchBody
		if json.Unmarshal(payload, &body) != nil || strings.TrimSpace(body.CaptainID) == "" {
			return false, "", nil
		}
		unavailable, err := dispatch.CaptainUnavailableAt(r.Context(), db, body.OperatorContextID, body.CaptainID, time.Now().UTC())
		return unavailable, body.CaptainID, err
	}
	if strings.HasPrefix(path, "/dsh/captain/dispatch/assignments/") && strings.HasSuffix(path, "/accept") {
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) < 6 {
			return false, "", nil
		}
		assignmentID := parts[4]
		var operatorContextID, captainID string
		err := db.QueryRowContext(r.Context(), `SELECT tenant_id,captain_id FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&operatorContextID, &captainID)
		if err != nil {
			return false, "", nil
		}
		unavailable, err := dispatch.CaptainUnavailableAt(r.Context(), db, operatorContextID, captainID, time.Now().UTC())
		return unavailable, captainID, err
	}
	return false, "", nil
}

func copyRecordedResponse(w http.ResponseWriter, recorder *httptest.ResponseRecorder) {
	for key, values := range recorder.Header() {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.WriteHeader(recorder.Code)
	_, _ = w.Write(recorder.Body.Bytes())
}

// OperationsAvailabilityMiddleware overlays Workforce notice truth onto the
// existing governed dispatch handlers without replacing their authorization,
// WLT eligibility, idempotency or assignment transaction logic.
func OperationsAvailabilityMiddleware(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		candidateList := r.Method == http.MethodGet && r.URL.Path == "/dsh/operator/dispatch/candidates"
		assignmentMutation := r.Method == http.MethodPost && (
			r.URL.Path == "/dsh/operator/dispatch/assignments" ||
			(strings.HasPrefix(r.URL.Path, "/dsh/operator/dispatch/assignments/") && strings.HasSuffix(r.URL.Path, "/reassign")) ||
			(strings.HasPrefix(r.URL.Path, "/dsh/captain/dispatch/assignments/") && strings.HasSuffix(r.URL.Path, "/accept")))
		if !candidateList && !assignmentMutation {
			next.ServeHTTP(w, r)
			return
		}

		unavailable, _, precheckErr := unavailableCaptainForRequest(r, db)
		recorder := httptest.NewRecorder()
		next.ServeHTTP(recorder, r)
		if candidateList && recorder.Code == http.StatusOK {
			var envelope struct {
				Candidates []dispatch.CaptainDispatchCandidate `json:"candidates"`
			}
			if json.Unmarshal(recorder.Body.Bytes(), &envelope) == nil {
				if err := dispatch.ApplyWorkforceAvailability(r.Context(), db, r.URL.Query().Get("operatorContextId"), time.Now().UTC(), envelope.Candidates); err == nil {
					store.SendJSON(w, http.StatusOK, map[string]any{"candidates": envelope.Candidates})
					return
				}
			}
		}
		if assignmentMutation && precheckErr == nil && unavailable && recorder.Code >= 500 {
			store.SendError(w, http.StatusConflict, "CAPTAIN_UNAVAILABLE_BY_WORKFORCE_NOTICE", "captain has an active Workforce unavailability notice")
			return
		}
		copyRecordedResponse(w, recorder)
	})
}

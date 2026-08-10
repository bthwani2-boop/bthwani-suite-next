package http

import (
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
	"workforce-api/internal/workforce"
)

func RegisterProvisioningRoutes(handler http.Handler, repo *workforce.Repository, identity *identityclient.Client, service *workforce.Service, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("provisioning routes require *http.ServeMux")
	}
	orchestrator := workforce.NewProvisioningOrchestrator(repo, identity, service)
	s := &server{repo: repo, auth: authClient, service: service}
	_ = orchestrator
	_ = s
	_ = mux

	//	mux.HandleFunc("POST /workforce/provisioning-cases", s.operatorOnly("provider:create", func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	//		startProvisioningCase(w, r, identity, orchestrator)
	//	}))
	//
	//	mux.HandleFunc("GET /workforce/provisioning-cases/{id}", s.anyAuthenticated(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	//		getProvisioningCase(w, r, s.repo)
	//	}))
	//
	//	mux.HandleFunc("POST /workforce/provisioning-cases/{id}/resume", s.operatorOnly("provider:create", func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	//		resumeProvisioningCase(w, r, identity, orchestrator)
	//	}))
}

func startProvisioningCase(w http.ResponseWriter, r *http.Request, identity auth.Identity, orchestrator *workforce.ProvisioningOrchestrator) {
	var req workforce.ProvisioningRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	req.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if req.IdempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
		return
	}

	pc, err := orchestrator.StartCase(r.Context(), req)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}

	operator := operatorOf(r, identity)
	pc, err = orchestrator.Advance(r.Context(), operator, pc.ID)

	if err != nil {
		writeWorkforceError(w, err)
		return
	}

	sendJSON(w, http.StatusCreated, pc)
}

func getProvisioningCase(w http.ResponseWriter, r *http.Request, repo *workforce.Repository) {
	id := r.PathValue("id")
	pc, err := repo.GetProvisioningCase(r.Context(), id)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, pc)
}

func resumeProvisioningCase(w http.ResponseWriter, r *http.Request, identity auth.Identity, orchestrator *workforce.ProvisioningOrchestrator) {
	id := r.PathValue("id")
	operator := operatorOf(r, identity)

	pc, err := orchestrator.Advance(r.Context(), operator, id)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}

	sendJSON(w, http.StatusOK, pc)
}

package http

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"

	"identity-api/internal/identity"
)

type employeeAccessServer struct {
	repository *identity.Repository
}

// RegisterEmployeeAccessRoutes adds the Workforce-only administrative employee
// provisioning surface without exposing arbitrary permission writes to browsers.
func RegisterEmployeeAccessRoutes(handler http.Handler, repository *identity.Repository) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("identity employee access routes require *http.ServeMux")
	}
	s := &employeeAccessServer{repository: repository}
	mux.HandleFunc("GET /internal/employees/permission-bundles", s.serviceOnly(s.permissionBundles))
	mux.HandleFunc("POST /internal/employees/provision", s.serviceOnly(s.provision))
}

func (s *employeeAccessServer) serviceOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "workforce" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
			return
		}
		expected := strings.TrimSpace(os.Getenv("IDENTITY_WORKFORCE_SERVICE_TOKEN"))
		if expected == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "internal API is not configured")
			return
		}
		token, ok := bearerToken(r)
		if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expected)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "service token is required")
			return
		}
		next(w, r)
	}
}

func (s *employeeAccessServer) permissionBundles(w http.ResponseWriter, _ *http.Request) {
	sendJSON(w, http.StatusOK, map[string]any{"permissionBundles": identity.EmployeePermissionBundles()})
}

func (s *employeeAccessServer) provision(w http.ResponseWriter, r *http.Request) {
	var input identity.EmployeeProvisionInput
	if !decodeJSON(w, r, &input) {
		return
	}
	trustedTenantID := strings.TrimSpace(input.TenantID)
	if tenantID, active, err := activeSaaSTenant(); err != nil {
		sendError(w, http.StatusServiceUnavailable, "SAAS_RUNTIME_CONFIG_INVALID", err.Error())
		return
	} else if active {
		if !validateInternalTenantRequest(w, r, tenantID) {
			return
		}
		if trustedTenantID != "" && trustedTenantID != tenantID {
			sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "provisioned employee tenant cannot override the active runtime tenant")
			return
		}
		trustedTenantID = tenantID
	}
	if trustedTenantID == "" {
		sendError(w, http.StatusBadRequest, "TENANT_CONTEXT_REQUIRED", "trusted tenant context is required for employee provisioning")
		return
	}
	input.TenantID = trustedTenantID
	if err := s.repository.ValidateEmployeePhoneTenant(r.Context(), input.PhoneE164, trustedTenantID); err != nil {
		writeInternalActorError(w, err)
		return
	}
	view, err := s.repository.ProvisionEmployee(r.Context(), input)
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, view)
}

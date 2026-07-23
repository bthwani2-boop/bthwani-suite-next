package http

import (
	"errors"
	"os"
	"strings"

	"platform-control-api/internal/auth"
)

type saasRuntimeStatus struct {
	Mode                           string `json:"mode"`
	CommercialActivationState      string `json:"commercialActivationState"`
	ProductionDeploymentAuthorized bool   `json:"productionDeploymentAuthorized"`
	DefaultTenantID                string `json:"defaultTenantId"`
	RuntimeEnabled                 bool   `json:"runtimeEnabled"`
}

func resolveSaasRuntimeStatus(getenv func(string) string) (saasRuntimeStatus, error) {
	mode := strings.ToLower(strings.TrimSpace(getenv("BTHWANI_SAAS_MODE")))
	activation := strings.ToLower(strings.TrimSpace(getenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE")))
	productionAuthorized := strings.EqualFold(strings.TrimSpace(getenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED")), "true")
	defaultTenantID := strings.TrimSpace(getenv("BTHWANI_DEFAULT_TENANT_ID"))

	if mode != "active" && mode != "deferred" {
		return saasRuntimeStatus{}, errors.New("BTHWANI_SAAS_MODE must be active or deferred")
	}
	if activation != "blocked" && activation != "eligible" && activation != "authorized" && activation != "active" {
		return saasRuntimeStatus{}, errors.New("BTHWANI_COMMERCIAL_ACTIVATION_STATE is invalid")
	}
	if mode == "active" && activation == "blocked" {
		return saasRuntimeStatus{}, errors.New("active SaaS runtime cannot remain policy blocked")
	}
	if mode == "active" && defaultTenantID == "" {
		return saasRuntimeStatus{}, errors.New("active SaaS runtime requires BTHWANI_DEFAULT_TENANT_ID")
	}
	if activation == "authorized" && productionAuthorized {
		return saasRuntimeStatus{}, errors.New("authorized runtime activation cannot imply production deployment")
	}
	if activation == "active" && !productionAuthorized {
		return saasRuntimeStatus{}, errors.New("commercial active state requires production deployment authorization")
	}

	return saasRuntimeStatus{
		Mode:                           mode,
		CommercialActivationState:      activation,
		ProductionDeploymentAuthorized: productionAuthorized,
		DefaultTenantID:                defaultTenantID,
		RuntimeEnabled:                 mode == "active" && (activation == "authorized" || activation == "active"),
	}, nil
}

func (s *server) saasStatus(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = s
	_ = r
	_ = identity
	status, err := resolveSaasRuntimeStatus(os.Getenv)
	if err != nil {
		sendError(w, http.StatusServiceUnavailable, "SAAS_RUNTIME_CONFIG_INVALID", err.Error())
		return
	}
	sendJSON(w, http.StatusOK, status)
}

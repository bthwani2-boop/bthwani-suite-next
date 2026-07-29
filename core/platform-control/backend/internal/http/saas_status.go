package http

import (
	"errors"
	"os"
	"strings"
)

type saasRuntimeStatus struct {
	Mode                           string `json:"mode"`
	CommercialActivationState      string `json:"commercialActivationState"`
	ProductionDeploymentAuthorized bool   `json:"productionDeploymentAuthorized"`
	DefaultOperatorContextID                string `json:"defaultOperatorContextId"`
	RuntimeEnabled                 bool   `json:"runtimeEnabled"`
}

func resolveSaasRuntimeStatus(getenv func(string) string) (saasRuntimeStatus, error) {
	mode := strings.ToLower(strings.TrimSpace(getenv("BTHWANI_SAAS_MODE")))
	activation := strings.ToLower(strings.TrimSpace(getenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE")))
	productionAuthorized := strings.EqualFold(strings.TrimSpace(getenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED")), "true")
	defaultOperatorContextID := strings.TrimSpace(getenv("BTHWANI_OPERATOR_CONTEXT_ID"))

	if mode != "active" && mode != "deferred" {
		return saasRuntimeStatus{}, errors.New("BTHWANI_SAAS_MODE must be active or deferred")
	}
	if activation != "blocked" && activation != "eligible" && activation != "authorized" && activation != "active" {
		return saasRuntimeStatus{}, errors.New("BTHWANI_COMMERCIAL_ACTIVATION_STATE is invalid")
	}
	if mode == "active" && activation == "eligible" {
		return saasRuntimeStatus{}, errors.New("active SaaS runtime requires activation authorization")
	}
	if mode == "active" && activation == "blocked" {
		return saasRuntimeStatus{}, errors.New("active SaaS runtime cannot remain policy blocked")
	}
	if mode == "active" && defaultOperatorContextID == "" {
		return saasRuntimeStatus{}, errors.New("active SaaS runtime requires BTHWANI_OPERATOR_CONTEXT_ID")
	}
	if activation == "active" && mode != "active" {
		return saasRuntimeStatus{}, errors.New("commercial active state requires active SaaS runtime")
	}
	if productionAuthorized {
		return saasRuntimeStatus{}, errors.New("production SaaS deployment cannot be enabled by environment configuration alone")
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
		DefaultOperatorContextID:                defaultOperatorContextID,
		RuntimeEnabled:                 mode == "active" && (activation == "authorized" || activation == "active"),
	}, nil
}

func currentSaasRuntimeStatus() (saasRuntimeStatus, error) {
	return resolveSaasRuntimeStatus(os.Getenv)
}

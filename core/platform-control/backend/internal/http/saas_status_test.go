package http

import "testing"

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestResolveSaasRuntimeStatusAuthorized(t *testing.T) {
	status, err := resolveSaasRuntimeStatus(env(map[string]string{
		"BTHWANI_SAAS_MODE":                         "active",
		"BTHWANI_COMMERCIAL_ACTIVATION_STATE":       "authorized",
		"BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED": "false",
		"BTHWANI_DEFAULT_TENANT_ID":                 "bthwani-platform-local",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !status.RuntimeEnabled {
		t.Fatal("expected SaaS runtime to be enabled")
	}
	if status.ProductionDeploymentAuthorized {
		t.Fatal("production deployment must remain separately authorized")
	}
}

func TestResolveSaasRuntimeStatusRejectsActiveWithoutTenant(t *testing.T) {
	_, err := resolveSaasRuntimeStatus(env(map[string]string{
		"BTHWANI_SAAS_MODE":                         "active",
		"BTHWANI_COMMERCIAL_ACTIVATION_STATE":       "authorized",
		"BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED": "false",
	}))
	if err == nil {
		t.Fatal("expected missing tenant configuration to fail")
	}
}

func TestResolveSaasRuntimeStatusRejectsProductionClaim(t *testing.T) {
	_, err := resolveSaasRuntimeStatus(env(map[string]string{
		"BTHWANI_SAAS_MODE":                         "active",
		"BTHWANI_COMMERCIAL_ACTIVATION_STATE":       "authorized",
		"BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED": "true",
		"BTHWANI_DEFAULT_TENANT_ID":                 "bthwani-platform-local",
	}))
	if err == nil {
		t.Fatal("expected unauthorized production claim to fail")
	}
}

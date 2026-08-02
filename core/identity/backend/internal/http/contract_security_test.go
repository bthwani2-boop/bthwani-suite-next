package http

import (
	"os"
	"strings"
	"testing"
)

const identityContractPath = "../../../contracts/identity.openapi.yaml"

func readIdentityContract(t *testing.T) string {
	t.Helper()
	content, err := os.ReadFile(identityContractPath)
	if err != nil {
		t.Fatalf("read identity contract: %v", err)
	}
	return string(content)
}

func identityOperationBlock(t *testing.T, contract, path string) string {
	t.Helper()
	marker := "\n  " + path + ":\n"
	start := strings.Index(contract, marker)
	if start < 0 {
		t.Fatalf("identity contract path %s is missing", path)
	}
	start += len(marker)
	rest := contract[start:]
	if end := strings.Index(rest, "\n  /"); end >= 0 {
		return rest[:end]
	}
	if end := strings.Index(rest, "\ncomponents:\n"); end >= 0 {
		return rest[:end]
	}
	return rest
}

func TestIdentityPreAuthenticationOperationsAreExplicitlyPublic(t *testing.T) {
	contract := readIdentityContract(t)
	for _, path := range []string{
		"/identity/health",
		"/identity/readiness",
		"/auth/login",
		"/auth/otp/request",
		"/auth/activate",
		"/auth/refresh",
		"/auth/introspect",
	} {
		block := identityOperationBlock(t, contract, path)
		if !strings.Contains(block, "security: []") {
			t.Errorf("%s must declare security: []", path)
		}
		if strings.Contains(block, "bearerAuth") || strings.Contains(block, "serviceToken") {
			t.Errorf("%s must not require an already-authenticated credential", path)
		}
	}
}

func TestIdentitySessionOperationsRemainBearerProtected(t *testing.T) {
	contract := readIdentityContract(t)
	for _, path := range []string{
		"/auth/logout",
		"/auth/session",
		"/auth/sessions",
		"/auth/sessions/{sessionId}",
		"/auth/account",
		"/auth/password/change",
	} {
		block := identityOperationBlock(t, contract, path)
		if !strings.Contains(block, "- bearerAuth: []") {
			t.Errorf("%s must require bearerAuth", path)
		}
	}
}

func TestIdentityInternalActorOperationsRemainServiceProtected(t *testing.T) {
	contract := readIdentityContract(t)
	for _, path := range []string{
		"/internal/actors/provision",
		"/internal/actors/search",
		"/internal/actors/{actorId}",
		"/internal/actors/{actorId}/deactivate",
		"/internal/actors/{actorId}/reactivate",
		"/internal/actors/{actorId}/activations",
		"/internal/actors/{actorId}/activations/latest",
		"/internal/actors/{actorId}/activations/revoke",
		"/internal/partner/permission-bundles",
	} {
		block := identityOperationBlock(t, contract, path)
		if !strings.Contains(block, "- serviceToken: []") {
			t.Errorf("%s must require serviceToken", path)
		}
		if !strings.Contains(block, "#/components/parameters/Authorization") {
			t.Errorf("%s must declare the Authorization header", path)
		}
		if !strings.Contains(block, "#/components/parameters/ServiceCaller") {
			t.Errorf("%s must declare the X-Service-Caller header", path)
		}
	}
}

func TestIdentityPublicFailureResponsesMatchRuntimeBoundaries(t *testing.T) {
	contract := readIdentityContract(t)

	login := identityOperationBlock(t, contract, "/auth/login")
	if !strings.Contains(login, "\"429\":") {
		t.Error("/auth/login must document runtime rate limiting")
	}

	otp := identityOperationBlock(t, contract, "/auth/otp/request")
	for _, status := range []string{"\"403\":", "\"429\":", "\"503\":"} {
		if !strings.Contains(otp, status) {
			t.Errorf("/auth/otp/request must document %s", status)
		}
	}

	activate := identityOperationBlock(t, contract, "/auth/activate")
	if !strings.Contains(activate, "\"429\":") {
		t.Error("/auth/activate must document runtime rate limiting")
	}
}

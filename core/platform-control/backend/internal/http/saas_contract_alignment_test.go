package http

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func readPlatformSaaSFixture(t *testing.T, relative string) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve SaaS contract test location")
	}
	path := filepath.Clean(filepath.Join(filepath.Dir(currentFile), relative))
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(content)
}

func requirePlatformSaaSMarker(t *testing.T, content, marker string) {
	t.Helper()
	if !strings.Contains(content, marker) {
		t.Fatalf("SaaS runtime contract chain is missing %q", marker)
	}
}

func TestPlatformSaaSRuntimeContractChain(t *testing.T) {
	t.Parallel()

	runtimeSource := readPlatformSaaSFixture(t, "saas_status.go")
	overlay := readPlatformSaaSFixture(t, "../../../contracts/platform-control.saas.overlay.yaml")
	generated := readPlatformSaaSFixture(t, "../../../clients/generated/platform-control-saas-runtime.ts")
	manifest := readPlatformSaaSFixture(t, "../../../service.manifest.ts")
	frontend := readPlatformSaaSFixture(t, "../../../../../services/dsh/frontend/shared/platform/platform-control.api.ts")

	for _, marker := range []string{
		`json:"mode"`,
		`json:"commercialActivationState"`,
		`json:"productionDeploymentAuthorized"`,
		`json:"defaultTenantId"`,
		`json:"runtimeEnabled"`,
	} {
		requirePlatformSaaSMarker(t, runtimeSource, marker)
	}

	for _, marker := range []string{
		"target: $.components.schemas.PlatformRuntimeSnapshot",
		"- saas",
		"PlatformSaasRuntimeStatus:",
		"commercialActivationState:",
		"productionDeploymentAuthorized:",
		"defaultTenantId:",
		"runtimeEnabled:",
	} {
		requirePlatformSaaSMarker(t, overlay, marker)
	}

	for _, marker := range []string{
		"export type PlatformSaasRuntimeStatus",
		`mode: "active" | "deferred"`,
		"PlatformRuntimeSnapshotWithSaaS",
		"saas: PlatformSaasRuntimeStatus",
	} {
		requirePlatformSaaSMarker(t, generated, marker)
	}

	requirePlatformSaaSMarker(t, manifest, `"contracts/platform-control.saas.overlay.yaml"`)
	requirePlatformSaaSMarker(t, manifest, `"clients/generated/platform-control-saas-runtime.ts"`)
	requirePlatformSaaSMarker(t, manifest, "tenantContextEnforcementReady: true")
	requirePlatformSaaSMarker(t, frontend, "PlatformRuntimeSnapshotWithSaaS")
	requirePlatformSaaSMarker(t, frontend, "fetchPlatformRuntimeConfig")
}

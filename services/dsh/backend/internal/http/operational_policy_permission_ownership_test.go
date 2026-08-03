package http

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestOperationalPolicyHandlersUseDomainPermissions(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("could not resolve test source path")
	}
	dir := filepath.Dir(currentFile)

	files := []string{"platformpolicies.go", "operational_policy.go"}
	combined := ""
	for _, name := range files {
		payload, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatal(err)
		}
		combined += string(payload)
	}

	for _, expected := range []string{
		"dsh.service_zones.read",
		"dsh.service_zones.manage",
		"dsh.fulfillment_sla.read",
		"dsh.fulfillment_sla.manage",
		"dsh.dispatch_capacity.read",
		"dsh.dispatch_capacity.manage",
		"dsh.operational_policy.audit.read",
		"dsh.operational_policy.rollback",
		"partners.read",
		"partners.manage",
	} {
		if !strings.Contains(combined, expected) {
			t.Fatalf("operational policy permission missing: %s", expected)
		}
	}

	for _, forbidden := range []string{
		"DshOperationalPolicyPermissionRead",
		"DshOperationalPolicyPermissionManage",
		`"platform.read"`,
		`"platform.manage"`,
		`"operations.read"`,
		`"operations.manage"`,
	} {
		if strings.Contains(combined, forbidden) {
			t.Fatalf("operational policy handlers still depend on broad permission: %s", forbidden)
		}
	}
}

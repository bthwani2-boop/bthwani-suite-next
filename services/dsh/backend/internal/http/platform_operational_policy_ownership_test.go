package http

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestLegacyOperationalPolicyRoutesForwardToCanonicalHandlers(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("could not resolve test source path")
	}
	dir := filepath.Dir(currentFile)

	if _, err := os.Stat(filepath.Join(dir, "platform_operational_policies.go")); !os.IsNotExist(err) {
		t.Fatalf("parallel operational policy handler file must not exist: %v", err)
	}

	compatPath := filepath.Join(dir, "platform_operational_policy_compat.go")
	payload, err := os.ReadFile(compatPath)
	if err != nil {
		t.Fatal(err)
	}
	source := string(payload)
	for _, marker := range []string{
		"s.handleListZones(w, r)",
		"s.handleCreateZone(w, r)",
		"s.handleUpdateZone(w, r)",
		"s.handleListSlaRules(w, r)",
		"s.handleUpsertSlaRules(w, r)",
		"s.handleGetCapacityConfig(w, r)",
		"s.handleUpsertCapacityConfig(w, r)",
		"s.handleGetZoneServiceability(w, r)",
		"write_path: FORWARDED_TO_CANONICAL",
	} {
		if !strings.Contains(source, marker) {
			t.Fatalf("canonical forwarding marker missing: %s", marker)
		}
	}
	for _, forbidden := range []string{
		"platform.read",
		"platform.manage",
		"decodeProtectedJSON",
		"platformpolicies.CreateZone",
		"platformpolicies.UpdateZone",
		"platformpolicies.UpsertSlaRule",
		"platformpolicies.UpsertCapacity",
	} {
		if strings.Contains(source, forbidden) {
			t.Fatalf("legacy compatibility path owns behavior or authorization: %s", forbidden)
		}
	}
}

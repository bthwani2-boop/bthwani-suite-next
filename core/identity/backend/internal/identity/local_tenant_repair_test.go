package identity

import "testing"

func TestNormalizeLocalBootstrapTenantID(t *testing.T) {
	tenantID, err := normalizeLocalBootstrapTenantID("  local-dsh  ")
	if err != nil {
		t.Fatalf("expected configured tenant to normalize: %v", err)
	}
	if tenantID != "local-dsh" {
		t.Fatalf("expected local-dsh, got %q", tenantID)
	}
	if _, err := normalizeLocalBootstrapTenantID("   "); err == nil {
		t.Fatal("blank bootstrap tenant must be rejected")
	}
}

func TestLocalBootstrapActorTenantRepairCoversAllLocalSurfaces(t *testing.T) {
	expected := map[string]bool{
		"operator-local-001":                 false,
		"partner-local-001":                  false,
		"field-local-001":                    false,
		"captain-local-001":                  false,
		"client-local-001":                   false,
		"platform-approver-local-001":        false,
		"platform-applier-local-001":         false,
		"platform-rollout-manager-local-001": false,
	}
	for _, actorID := range localBootstrapActorIDs {
		if _, ok := expected[actorID]; !ok {
			t.Fatalf("unexpected local bootstrap actor %q", actorID)
		}
		expected[actorID] = true
	}
	for actorID, covered := range expected {
		if !covered {
			t.Fatalf("local bootstrap tenant repair does not cover %q", actorID)
		}
	}
}

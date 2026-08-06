package identity

import (
	"testing"
)

func TestPartnerPermissionBundlesContainsAllRoles(t *testing.T) {
	bundles := PartnerPermissionBundles()
	if len(bundles) != 5 {
		t.Fatalf("expected 5 partner permission bundles, got %d", len(bundles))
	}

	foundOwner := false
	for _, b := range bundles {
		if b.Code == PartnerBundleOwner {
			foundOwner = true
		}
	}
	if !foundOwner {
		t.Errorf("missing owner role from registry")
	}
}

func TestPartnerBundlePermissions(t *testing.T) {
	tests := []struct {
		role       string
		storeID    string
		wantAction string
		wantScope  string
	}{
		{PartnerBundleOwner, "store123", "team.manage", "store:store123"},
		{PartnerBundleManager, "store456", "courier.manage", "store:store456"},
		{PartnerBundleCourier, "store789", "orders.manage", "store:store789"},
		{PartnerBundleStaff, "store999", "orders.manage", "store:store999"},
		{"unknown_role", "store000", "orders.manage", "store:store000"},
	}

	for _, tc := range tests {
		t.Run(tc.role, func(t *testing.T) {
			perms := PartnerBundlePermissions(tc.role, tc.storeID)
			found := false
			for _, p := range perms {
				if p.Action == tc.wantAction && p.Scope == tc.wantScope {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("expected permission action %q with scope %q for role %q, got %v", tc.wantAction, tc.wantScope, tc.role, perms)
			}
		})
	}
}

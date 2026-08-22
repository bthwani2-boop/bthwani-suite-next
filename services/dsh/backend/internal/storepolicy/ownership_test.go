package storepolicy

import "testing"

func TestPartnerStatusAllowsStoreOwnership(t *testing.T) {
	t.Parallel()

	allowed := []string{
		"draft",
		"submitted",
		"documents_missing",
		"ops_review",
		"ops_approved",
		"partner_active",
		"client_visible",
		"client_hidden",
	}
	for _, status := range allowed {
		if !PartnerStatusAllowsStoreOwnership(status) {
			t.Fatalf("expected %q to allow store ownership acquisition", status)
		}
	}

	blocked := []string{"", "ops_rejected", "partner_suspended", "partner_terminated"}
	for _, status := range blocked {
		if PartnerStatusAllowsStoreOwnership(status) {
			t.Fatalf("expected %q to block store ownership acquisition", status)
		}
	}
}

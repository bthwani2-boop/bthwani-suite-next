package storepolicy

import "strings"

// PartnerStatusAllowsStoreOwnership is the acquisition invariant used by store
// creation and ownership-transfer paths. A partner may acquire unpublished
// stores throughout onboarding, but rejected, deactivated, suspended, or
// terminated partners cannot gain new operational ownership authority.
func PartnerStatusAllowsStoreOwnership(status string) bool {
	switch strings.TrimSpace(status) {
	case "", "ops_rejected", "partner_suspended", "partner_terminated":
		return false
	default:
		return true
	}
}

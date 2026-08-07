package storepolicy

import "strings"

// PartnerStatusAllowsStoreOwnership is the single lifecycle invariant used by
// store creation and ownership-transfer paths. A partner may own unpublished
// stores throughout onboarding, but rejected, suspended, or terminated
// partners cannot acquire additional operational authority.
func PartnerStatusAllowsStoreOwnership(status string) bool {
	switch strings.TrimSpace(status) {
	case "", "ops_rejected", "partner_suspended", "partner_terminated":
		return false
	default:
		return true
	}
}

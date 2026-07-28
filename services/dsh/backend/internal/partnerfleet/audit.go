package partnerfleet

import "strings"

func auditIdempotencyKey(action, reference string) string {
	action = strings.TrimSpace(action)
	reference = strings.TrimSpace(reference)
	return "fleet-action:" + action + ":" + reference
}

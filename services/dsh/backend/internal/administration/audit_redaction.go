package administration

import (
	"encoding/json"
	"sort"
	"strings"
)

// permittedAuditDetailKeys is the allowlist of administration audit detail keys
// that may be read back. Anything outside it is dropped rather than masked, so a
// new detail key cannot leak by default.
var permittedAuditDetailKeys = map[string]struct{}{
	"approval_id":        {},
	"request_id":         {},
	"role_id":            {},
	"source_approval_id": {},
	"decision":           {},
	"action_type":        {},
	"reason_provided":    {},
	"note_provided":      {},
	"permission_count":   {},
	"surface_count":      {},
}

// redactAuditDetail strips every non-allowlisted key from a dsh_admin_audit
// detail before it leaves the service. It accepts both the JSON detail written
// by current callers and the legacy `key=value; key=value` form still present in
// rows written before the JSON cutover.
func redactAuditDetail(detail string) string {
	detail = strings.TrimSpace(detail)
	if detail == "" {
		return ""
	}
	var object map[string]any
	if json.Unmarshal([]byte(detail), &object) == nil {
		clean := make(map[string]any, len(object))
		for key, value := range object {
			if _, ok := permittedAuditDetailKeys[key]; ok {
				clean[key] = value
			}
		}
		encoded, err := json.Marshal(clean)
		if err == nil {
			return string(encoded)
		}
	}
	parts := strings.Split(detail, ";")
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		key, value, found := strings.Cut(strings.TrimSpace(part), "=")
		if !found {
			continue
		}
		key = strings.TrimSpace(key)
		if _, ok := permittedAuditDetailKeys[key]; !ok {
			continue
		}
		value = strings.TrimSpace(value)
		if len(value) > 120 {
			value = value[:120]
		}
		clean = append(clean, key+"="+value)
	}
	sort.Strings(clean)
	return strings.Join(clean, "; ")
}

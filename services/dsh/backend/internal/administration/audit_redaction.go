package administration

import (
	"encoding/json"
	"strings"
)

// permittedAuditDetailKeys is the allowlist of administration audit detail keys
// that may be read back. Anything outside it is dropped rather than masked, so a
// new detail key cannot leak by default.
var permittedAuditDetailKeys = map[string]struct{}{
	"request_id":       {},
	"decision":         {},
	"action_type":      {},
	"reason_provided":  {},
	"note_provided":    {},
	"permission_count": {},
	"surface_count":    {},
}

// redactAuditDetail strips every non-allowlisted key from the canonical JSON
// audit detail. DSH-1040 reconciles legacy prose before runtime cutover, so an
// invalid or non-JSON value fails closed to an empty object.
func redactAuditDetail(detail string) string {
	detail = strings.TrimSpace(detail)
	if detail == "" {
		return ""
	}
	var object map[string]any
	if json.Unmarshal([]byte(detail), &object) != nil {
		return "{}"
	}
	clean := make(map[string]any, len(object))
	for key, value := range object {
		if _, ok := permittedAuditDetailKeys[key]; ok {
			clean[key] = value
		}
	}
	encoded, err := json.Marshal(clean)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}

package partner

import "strings"

// canonicalBusinessVerticalID accepts the legacy category vocabulary only as
// an input compatibility bridge. Once a draft has a vertical, all lifecycle
// gates use the central catalog domain ID.
func canonicalBusinessVerticalID(verticalID, category string) string {
	verticalID = strings.TrimSpace(verticalID)
	if verticalID != "" {
		return verticalID
	}
	switch strings.TrimSpace(category) {
	case "restaurant":
		return "domain-restaurants"
	case "grocery", "bakery":
		return "domain-groceries"
	case "pharmacy":
		return "domain-pharmacy"
	default:
		return ""
	}
}

package orders

import "encoding/json"

// MarshalJSON keeps the public order-truth contract stable for migrated legacy
// orders that may not yet have item or event rows. Arrays are always arrays,
// never null, so mobile and web consumers can render empty states safely.
func (truth OrderTruth) MarshalJSON() ([]byte, error) {
	type orderTruthAlias OrderTruth
	copy := truth
	if copy.Items == nil {
		copy.Items = []OrderTruthItem{}
	}
	if copy.StatusTimeline == nil {
		copy.StatusTimeline = []OrderTruthEvent{}
	}
	if copy.AllowedActions == nil {
		copy.AllowedActions = []string{"view"}
	}
	return json.Marshal(orderTruthAlias(copy))
}

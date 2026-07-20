package orders

import "time"

// EvaluatePreparationTiming derives volatile SLA fields from persisted timing.
// It does not mutate database state and is shared by partner/client/operator
// projections so every surface classifies the same deadline identically.
func EvaluatePreparationTiming(timing PreparationTiming, now time.Time) PreparationTiming {
	calculatePreparationSLA(&timing, now)
	return timing
}

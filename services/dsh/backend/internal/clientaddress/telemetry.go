package clientaddress

import (
	"errors"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

type operationTelemetryBucket struct {
	requests      atomic.Uint64
	failures      atomic.Uint64
	totalDuration atomic.Uint64
	maxDuration   atomic.Uint64
	outcomes      sync.Map
}

type outcomeCounter struct {
	value atomic.Uint64
}

// OperationTelemetry is deliberately aggregate-only. It never contains client,
// address, recipient, phone, coordinates, instructions or correlation values.
type OperationTelemetry struct {
	Operation       string            `json:"operation"`
	Requests        uint64            `json:"requests"`
	Failures        uint64            `json:"failures"`
	AverageDuration float64           `json:"averageDurationMs"`
	MaxDuration     float64           `json:"maxDurationMs"`
	Outcomes        map[string]uint64 `json:"outcomes"`
}

var clientAddressTelemetry sync.Map

func telemetryOutcome(err error) string {
	switch {
	case err == nil:
		return "success"
	case errors.Is(err, ErrInvalid):
		return "invalid"
	case errors.Is(err, ErrNotFound):
		return "not_found"
	case errors.Is(err, ErrMutationIdempotencyConflict):
		return "idempotency_conflict"
	case IsDuplicateError(err):
		return "duplicate"
	case errors.Is(err, ErrConflict):
		return "version_conflict"
	case errors.Is(err, ErrServiceAreaUnverified):
		return "service_area_unverified"
	default:
		return "internal_error"
	}
}

func telemetryBucket(operation string) *operationTelemetryBucket {
	value, _ := clientAddressTelemetry.LoadOrStore(operation, &operationTelemetryBucket{})
	return value.(*operationTelemetryBucket)
}

func updateMax(target *atomic.Uint64, value uint64) {
	for {
		current := target.Load()
		if value <= current || target.CompareAndSwap(current, value) {
			return
		}
	}
}

// RecordOperation records an aggregate result for a fixed operation name.
// Callers must pass only constants such as list/create/update/delete/set_default.
func RecordOperation(operation string, started time.Time, err error) {
	bucket := telemetryBucket(operation)
	duration := uint64(time.Since(started).Nanoseconds())
	bucket.requests.Add(1)
	bucket.totalDuration.Add(duration)
	updateMax(&bucket.maxDuration, duration)
	if err != nil {
		bucket.failures.Add(1)
	}
	outcome := telemetryOutcome(err)
	value, _ := bucket.outcomes.LoadOrStore(outcome, &outcomeCounter{})
	value.(*outcomeCounter).value.Add(1)
}

func TelemetrySnapshot() []OperationTelemetry {
	result := make([]OperationTelemetry, 0, 5)
	clientAddressTelemetry.Range(func(key, value any) bool {
		operation := key.(string)
		bucket := value.(*operationTelemetryBucket)
		requests := bucket.requests.Load()
		outcomes := make(map[string]uint64)
		bucket.outcomes.Range(func(outcomeKey, outcomeValue any) bool {
			outcomes[outcomeKey.(string)] = outcomeValue.(*outcomeCounter).value.Load()
			return true
		})
		average := float64(0)
		if requests > 0 {
			average = float64(bucket.totalDuration.Load()) / float64(requests) / float64(time.Millisecond)
		}
		result = append(result, OperationTelemetry{
			Operation:       operation,
			Requests:        requests,
			Failures:        bucket.failures.Load(),
			AverageDuration: average,
			MaxDuration:     float64(bucket.maxDuration.Load()) / float64(time.Millisecond),
			Outcomes:        outcomes,
		})
		return true
	})
	sort.Slice(result, func(i, j int) bool { return result[i].Operation < result[j].Operation })
	return result
}

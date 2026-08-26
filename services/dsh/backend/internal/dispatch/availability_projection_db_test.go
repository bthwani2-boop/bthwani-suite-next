package dispatch

import (
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestWorkforceAvailabilityProjectionIsOrderedIdempotentAndConcurrencySafe(t *testing.T) {
	db := openRequiredDB(t)
	suffix := time.Now().UnixNano()
	operatorContextID := fmt.Sprintf("availability-projection-context-%d", suffix)
	noticeID := fmt.Sprintf("availability-projection-notice-%d", suffix)
	cleanup := func() {
		_, _ = db.Exec(`DELETE FROM dsh_provider_availability_projections WHERE operator_context_id=$1 AND notice_id=$2`, operatorContextID, noticeID)
	}
	cleanup()
	t.Cleanup(cleanup)

	base := ProviderAvailabilityProjectionInput{
		OperatorContextID: operatorContextID,
		NoticeID:          noticeID,
		ActorType:         "captain",
		ActorID:           "availability-projection-captain",
		NoticeType:        "short_break",
		StartsAt:          time.Date(2026, 8, 26, 8, 0, 0, 0, time.UTC),
		EndsAt:            time.Date(2026, 8, 26, 9, 0, 0, 0, time.UTC),
		Status:            "active",
		Reason:            "test",
		SourceUpdatedAt:   time.Date(2026, 8, 26, 7, 0, 0, 0, time.UTC),
	}
	v2 := base
	v2.SourceVersion = 2
	v2.IdempotencyKey = AvailabilityProjectionIdempotencyKey(operatorContextID, noticeID, 2)
	v3 := v2
	v3.SourceVersion = 3
	v3.EndsAt = time.Date(2026, 8, 26, 10, 0, 0, 0, time.UTC)
	v3.IdempotencyKey = AvailabilityProjectionIdempotencyKey(operatorContextID, noticeID, 3)
	v4 := v3
	v4.SourceVersion = 4
	v4.EndsAt = time.Date(2026, 8, 26, 11, 0, 0, 0, time.UTC)
	v4.IdempotencyKey = AvailabilityProjectionIdempotencyKey(operatorContextID, noticeID, 4)

	start := make(chan struct{})
	results := make(chan error, 2)
	var group sync.WaitGroup
	for _, input := range []ProviderAvailabilityProjectionInput{v2, v3} {
		input := input
		group.Add(1)
		go func() {
			defer group.Done()
			<-start
			_, err := UpsertProviderAvailabilityProjection(t.Context(), db, input)
			results <- err
		}()
	}
	close(start)
	group.Wait()
	close(results)
	for err := range results {
		if err != nil && !errors.Is(err, ErrAvailabilityProjectionStale) {
			t.Fatalf("concurrent ordered projection failed: %v", err)
		}
	}

	var sourceVersion int64
	var storedEndsAt time.Time
	if err := db.QueryRow(`SELECT source_version, ends_at FROM dsh_provider_availability_projections WHERE operator_context_id=$1 AND notice_id=$2`, operatorContextID, noticeID).Scan(&sourceVersion, &storedEndsAt); err != nil {
		t.Fatalf("read final ordered projection: %v", err)
	}
	if sourceVersion != 3 || !storedEndsAt.Equal(v3.EndsAt) {
		t.Fatalf("final projection = version %d ends %s, want version 3 ends %s", sourceVersion, storedEndsAt, v3.EndsAt)
	}

	duplicateResults := make(chan ProviderAvailabilityProjection, 2)
	duplicateErrors := make(chan error, 2)
	start = make(chan struct{})
	for range 2 {
		group.Add(1)
		go func() {
			defer group.Done()
			<-start
			result, err := UpsertProviderAvailabilityProjection(t.Context(), db, v4)
			duplicateResults <- result
			duplicateErrors <- err
		}()
	}
	close(start)
	group.Wait()
	close(duplicateResults)
	close(duplicateErrors)
	idempotentCount := 0
	for result := range duplicateResults {
		if result.Idempotent {
			idempotentCount++
		}
	}
	for err := range duplicateErrors {
		if err != nil {
			t.Fatalf("concurrent duplicate projection failed: %v", err)
		}
	}
	if idempotentCount != 1 {
		t.Fatalf("concurrent duplicate acknowledgement count = %d, want one replay acknowledgement", idempotentCount)
	}
	if err := db.QueryRow(`SELECT source_version FROM dsh_provider_availability_projections WHERE operator_context_id=$1 AND notice_id=$2`, operatorContextID, noticeID).Scan(&sourceVersion); err != nil {
		t.Fatalf("read final duplicate projection: %v", err)
	}
	if sourceVersion != 4 {
		t.Fatalf("final duplicate projection version = %d, want 4", sourceVersion)
	}

	if _, err := UpsertProviderAvailabilityProjection(t.Context(), db, v3); !errors.Is(err, ErrAvailabilityProjectionStale) {
		t.Fatalf("stale source replay error = %v, want ErrAvailabilityProjectionStale", err)
	}
	conflictingReplay := v4
	conflictingReplay.EndsAt = time.Date(2026, 8, 26, 12, 0, 0, 0, time.UTC)
	if _, err := UpsertProviderAvailabilityProjection(t.Context(), db, conflictingReplay); !errors.Is(err, ErrAvailabilityProjectionIdempotencyConflict) {
		t.Fatalf("same-version conflicting replay error = %v, want ErrAvailabilityProjectionIdempotencyConflict", err)
	}
}

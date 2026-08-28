package dispatch

import (
	"errors"
	"testing"
	"time"
)

func TestAvailabilityProjectionIdentityIsDeterministic(t *testing.T) {
	got := AvailabilityProjectionIdempotencyKey(" context-1 ", " notice-1 ", 7)
	if got != "workforce-availability-v1:context-1:notice-1:7" {
		t.Fatalf("unexpected deterministic idempotency key %q", got)
	}
}

func TestNormalizeAvailabilityProjectionRejectsIdentityDrift(t *testing.T) {
	input := ProviderAvailabilityProjectionInput{
		OperatorContextID: "context-1",
		NoticeID:          "notice-1",
		ActorType:         "captain",
		ActorID:           "captain-1",
		NoticeType:        "short_break",
		StartsAt:          time.Date(2026, 8, 26, 8, 0, 0, 0, time.UTC),
		EndsAt:            time.Date(2026, 8, 26, 9, 0, 0, 0, time.UTC),
		Status:            "active",
		SourceVersion:     2,
		SourceUpdatedAt:   time.Date(2026, 8, 26, 7, 0, 0, 0, time.UTC),
		IdempotencyKey:    "workforce-availability-v1:context-1:notice-1:1",
	}
	if err := normalizeAvailabilityProjection(&input); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected idempotency identity conflict, got %v", err)
	}
}

func TestAvailabilityProjectionPayloadRequiresVersionAndTimestamp(t *testing.T) {
	input := ProviderAvailabilityProjectionInput{
		OperatorContextID: "context-1",
		NoticeID:          "notice-1",
		ActorType:         "captain",
		ActorID:           "captain-1",
		NoticeType:        "short_break",
		StartsAt:          time.Date(2026, 8, 26, 8, 0, 0, 0, time.UTC),
		EndsAt:            time.Date(2026, 8, 26, 9, 0, 0, 0, time.UTC),
		Status:            "active",
	}
	if err := normalizeAvailabilityProjection(&input); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected version/timestamp validation failure, got %v", err)
	}
}

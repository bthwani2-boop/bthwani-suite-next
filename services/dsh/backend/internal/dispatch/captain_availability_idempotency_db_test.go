package dispatch

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"testing"
	"time"
)

func TestCaptainAvailabilityCommandReceiptReplaysWithoutASecondTransitionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextID := "captain-availability-context-" + suffix
	captainID := "captain-availability-captain-" + suffix
	actorID := captainID
	idempotencyKey := "captain-availability-command-" + suffix
	correlationID := "captain-availability-correlation-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_captain_dispatch_profiles
			(operator_context_id, captain_id, accreditation_status, availability_status, updated_by, version)
		VALUES ($1, $2, 'approved', 'offline', $2, 1)
	`, operatorContextID, captainID); err != nil {
		t.Fatalf("failed to seed Captain dispatch profile: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_captain_availability_command_receipts WHERE operator_context_id = $1`, operatorContextID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_captain_dispatch_profiles WHERE operator_context_id = $1 AND captain_id = $2`, operatorContextID, captainID)
	})

	first, err := SetCaptainAvailability(
		db, operatorContextID, captainID, actorID, CaptainAvailabilityAvailable, 1, idempotencyKey, correlationID,
	)
	if err != nil {
		t.Fatalf("first Captain availability command failed: %v", err)
	}
	if first.Status != CaptainAvailabilityAvailable || first.Version != 2 {
		t.Fatalf("first readback = %#v, want available at version 2", first)
	}

	replay, err := SetCaptainAvailability(
		db, operatorContextID, captainID, actorID, CaptainAvailabilityAvailable, 1, idempotencyKey, correlationID,
	)
	if err != nil {
		t.Fatalf("replaying Captain availability command failed: %v", err)
	}
	if replay.Status != first.Status || replay.Version != first.Version || !replay.UpdatedAt.Equal(first.UpdatedAt) {
		t.Fatalf("replay readback = %#v, want the original canonical readback %#v", replay, first)
	}

	var profileVersion, receiptCount int
	if err := db.QueryRowContext(ctx, `
		SELECT version FROM dsh_captain_dispatch_profiles
		WHERE operator_context_id = $1 AND captain_id = $2
	`, operatorContextID, captainID).Scan(&profileVersion); err != nil {
		t.Fatalf("failed to read profile version: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		SELECT count(*) FROM dsh_captain_availability_command_receipts
		WHERE operator_context_id = $1 AND actor_id = $2 AND idempotency_key = $3
	`, operatorContextID, actorID, idempotencyKey).Scan(&receiptCount); err != nil {
		t.Fatalf("failed to count Captain availability receipts: %v", err)
	}
	if profileVersion != 2 || receiptCount != 1 {
		t.Fatalf("stored transition = version %d with %d receipts, want version 2 with one receipt", profileVersion, receiptCount)
	}

	if _, err := SetCaptainAvailability(
		db, operatorContextID, captainID, actorID, CaptainAvailabilityUnavailable, 2, idempotencyKey, correlationID,
	); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("reusing key for another command returned %v, want ErrIdempotencyConflict", err)
	}

	staleKey := fmt.Sprintf("captain-availability-stale-%s", suffix)
	if _, err := SetCaptainAvailability(
		db, operatorContextID, captainID, actorID, CaptainAvailabilityUnavailable, 1, staleKey, correlationID,
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale Captain availability command returned %v, want ErrConflict", err)
	}
}

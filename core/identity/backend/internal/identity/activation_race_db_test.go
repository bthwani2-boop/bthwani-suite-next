package identity

import (
	"context"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
)

func TestActivationConcurrentIssue(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	// Create test actor
	phone := "+967777000100"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, phone_e164, roles, active, permissions)
		VALUES ($1, $2, $3, '{field}', false, '[]')`,
		actorID, "race_issue_1", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	concurrency := 10
	var successCount int32
	var wg sync.WaitGroup

	idempotencyKey := "race_idempotency_1"

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
				IssuedByActorID:   "operator-1",
				ExpectedActorType: "field",
				ExpectedSurface:   "app-field",
			}, idempotencyKey, "corr-1")
			
			if err == nil {
				atomic.AddInt32(&successCount, 1)
			} else if !errors.Is(err, ErrActivationRateLimited) && !strings.Contains(err.Error(), "duplicate key value violates unique constraint") && !strings.Contains(err.Error(), "deadlock detected") {
				t.Errorf("unexpected error during concurrent issue: %v", err)
			}
		}()
	}
	wg.Wait()

	if successCount != 1 {
		t.Errorf("expected exactly 1 successful issuance, got %d", successCount)
	}

	var count int
	err = db.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM identity_activation_challenges WHERE actor_id = $1`, actorID).Scan(&count)
	if err != nil {
		t.Fatalf("count challenges: %v", err)
	}
	if count != 1 {
		t.Errorf("expected exactly 1 challenge in DB, got %d", count)
	}
}

func TestActivationConcurrentConsumeAndRevoke(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	phone := "+967777000101"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, phone_e164, roles, active, permissions)
		VALUES ($1, $2, $3, '{field}', false, '[]')`,
		actorID, "race_consume_1", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   "operator-1",
		ExpectedActorType: "field",
		ExpectedSurface:   "app-field",
	}, "idem-2", "corr-2")
	if err != nil {
		t.Fatalf("issue activation: %v", err)
	}

	var wg sync.WaitGroup
	wg.Add(2)

	var consumeErr error

	go func() {
		defer wg.Done()
		_, consumeErr = repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
			ActorType:         "field",
			Phone:             phone,
			Code:              res.Code,
			DeviceFingerprint: "device-1",
		})
	}()

	go func() {
		defer wg.Done()
		_ = repo.RevokeActivationChallenges(context.Background(), actorID)
	}()

	wg.Wait()
	
	if consumeErr != nil && !errors.Is(consumeErr, ErrInvalidActivation) && !strings.Contains(consumeErr.Error(), "deadlock detected") {
		t.Errorf("unexpected consume error: %v", consumeErr)
	}

	var status string
	err = db.QueryRowContext(context.Background(), `SELECT status FROM identity_activation_challenges WHERE id = $1`, res.ActivationID).Scan(&status)
	if err != nil {
		t.Fatalf("get status: %v", err)
	}

	if status == "pending" {
		t.Errorf("status should not be pending after concurrent consume/revoke")
	}
	if status == "consumed" && consumeErr != nil {
		t.Errorf("status is consumed but consume returned error")
	}
	if status == "revoked" && consumeErr == nil {
		t.Errorf("status is revoked but consume succeeded")
	}
}

func TestActivationConcurrentConsumeDuplicates(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	phone := "+967777000102"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, phone_e164, roles, active, permissions)
		VALUES ($1, $2, $3, '{field}', false, '[]')`,
		actorID, "race_consume_2", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   "operator-1",
		ExpectedActorType: "field",
		ExpectedSurface:   "app-field",
	}, "idem-3", "corr-3")
	if err != nil {
		t.Fatalf("issue activation: %v", err)
	}

	concurrency := 10
	var successCount int32
	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
				ActorType:         "field",
				Phone:             phone,
				Code:              res.Code,
				DeviceFingerprint: "device-1",
			})
			if err == nil {
				atomic.AddInt32(&successCount, 1)
			} else if !errors.Is(err, ErrInvalidActivation) && !strings.Contains(err.Error(), "deadlock detected") {
				t.Errorf("unexpected error during concurrent consume: %v", err)
			}
		}()
	}
	wg.Wait()

	if successCount != 1 {
		t.Errorf("expected exactly 1 successful consume, got %d", successCount)
	}

	var status string
	err = db.QueryRowContext(context.Background(), `SELECT status FROM identity_activation_challenges WHERE id = $1`, res.ActivationID).Scan(&status)
	if err != nil {
		t.Fatalf("get status: %v", err)
	}
	if status != "consumed" {
		t.Errorf("expected status 'consumed', got %q", status)
	}
}

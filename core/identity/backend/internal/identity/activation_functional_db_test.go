package identity

import (
	"context"
	"errors"
	"testing"
)

func TestActivationFunctionalConsumeWrongSurface(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	phone := "+967777000200"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, phone_e164, roles, active, permissions)
		VALUES ($1, $2, $3, '{field}', false, '[]')`,
		actorID, "func_wrong_surf", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   "operator-1",
		ExpectedActorType: "field",
		ExpectedSurface:   "app-field",
	}, "idem-func-1", "corr-func-1")
	if err != nil {
		t.Fatalf("issue activation: %v", err)
	}

	_, err = repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
		ActorType:         "captain", // Intentionally wrong surface mapping (captain maps to app-captain)
		Phone:             phone,
		Code:              res.Code,
		DeviceFingerprint: "device-1",
	})
	if !errors.Is(err, ErrInvalidActivation) {
		t.Errorf("expected ErrInvalidActivation for wrong surface, got %v", err)
	}
}

func TestActivationFunctionalConsumeRevoked(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	phone := "+967777000201"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, phone_e164, roles, active, permissions)
		VALUES ($1, $2, $3, '{field}', false, '[]')`,
		actorID, "func_revoked", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   "operator-1",
		ExpectedActorType: "field",
		ExpectedSurface:   "app-field",
	}, "idem-func-2", "corr-func-2")
	if err != nil {
		t.Fatalf("issue activation: %v", err)
	}

	err = repo.RevokeActivationChallenges(context.Background(), actorID)
	if err != nil {
		t.Fatalf("revoke activation: %v", err)
	}

	_, err = repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
		ActorType:         "field",
		Phone:             phone,
		Code:              res.Code,
		DeviceFingerprint: "device-1",
	})
	if !errors.Is(err, ErrInvalidActivation) {
		t.Errorf("expected ErrInvalidActivation for revoked code, got %v", err)
	}
}

func TestActivationFunctionalConsumeExpired(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	phone := "+967777000202"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, phone_e164, roles, active, permissions)
		VALUES ($1, $2, $3, '{field}', false, '[]')`,
		actorID, "func_expired", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   "operator-1",
		ExpectedActorType: "field",
		ExpectedSurface:   "app-field",
	}, "idem-func-3", "corr-func-3")
	if err != nil {
		t.Fatalf("issue activation: %v", err)
	}

	// Manually force expiry in the database
	_, err = db.ExecContext(context.Background(), `UPDATE identity_activation_challenges SET expires_at = now() - interval '1 minute' WHERE id = $1`, res.ActivationID)
	if err != nil {
		t.Fatalf("force expire: %v", err)
	}

	_, err = repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
		ActorType:         "field",
		Phone:             phone,
		Code:              res.Code,
		DeviceFingerprint: "device-1",
	})
	if !errors.Is(err, ErrInvalidActivation) {
		t.Errorf("expected ErrInvalidActivation for expired code, got %v", err)
	}

	// Verify status updated to expired
	var status string
	err = db.QueryRowContext(context.Background(), `SELECT status FROM identity_activation_challenges WHERE id = $1`, res.ActivationID).Scan(&status)
	if err != nil {
		t.Fatalf("get status: %v", err)
	}
	if status != "expired" {
		t.Errorf("expected status 'expired', got %q", status)
	}
}

func TestActivationFunctionalConsumeBruteForceLockout(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	phone := "+967777000203"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, phone_e164, roles, active, permissions)
		VALUES ($1, $2, $3, '{field}', false, '[]')`,
		actorID, "func_lockout", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   "operator-1",
		ExpectedActorType: "field",
		ExpectedSurface:   "app-field",
	}, "idem-func-4", "corr-func-4")
	if err != nil {
		t.Fatalf("issue activation: %v", err)
	}

	// Attempt wrong code 5 times
	for i := 0; i < 5; i++ {
		_, err = repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
			ActorType:         "field",
			Phone:             phone,
			Code:              "111111", // Wrong code
			DeviceFingerprint: "device-1",
		})
		if !errors.Is(err, ErrInvalidActivation) {
			t.Errorf("attempt %d: expected ErrInvalidActivation for wrong code, got %v", i+1, err)
		}
	}

	// Attempt 6 with correct code -> should fail because locked
	_, err = repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
		ActorType:         "field",
		Phone:             phone,
		Code:              res.Code,
		DeviceFingerprint: "device-1",
	})
	if !errors.Is(err, ErrInvalidActivation) {
		t.Errorf("expected ErrInvalidActivation for locked code, got %v", err)
	}

	// Verify status updated to locked
	var status string
	err = db.QueryRowContext(context.Background(), `SELECT status FROM identity_activation_challenges WHERE id = $1`, res.ActivationID).Scan(&status)
	if err != nil {
		t.Fatalf("get status: %v", err)
	}
	if status != "locked" {
		t.Errorf("expected status 'locked', got %q", status)
	}
}

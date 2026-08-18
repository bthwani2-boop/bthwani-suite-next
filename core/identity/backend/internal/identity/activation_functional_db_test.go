package identity

import (
	"context"
	"database/sql"
	"errors"
	"testing"
)

const activationTestIssuerID = "identity-db-test-issuer"

func seedActivationTestIssuer(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`DELETE FROM identity_activation_challenges WHERE issued_by_actor_id = $1`, activationTestIssuerID); err != nil {
		t.Fatalf("clean activation test issuer challenges: %v", err)
	}
	if _, err := db.Exec(`DELETE FROM identity_actors WHERE id = $1`, activationTestIssuerID); err != nil {
		t.Fatalf("clean activation test issuer: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO identity_actors
			(id, username, password_hash, operator_context_id, roles, permissions, status, version)
		VALUES ($1, 'identity-db-test-issuer', '', 'local-dsh', '{operator}', '[]', 'ACTIVE', 1)`, activationTestIssuerID); err != nil {
		t.Fatalf("seed activation test issuer: %v", err)
	}
	t.Cleanup(func() {
		if _, err := db.Exec(`DELETE FROM identity_activation_challenges WHERE issued_by_actor_id = $1`, activationTestIssuerID); err != nil {
			t.Errorf("clean activation test issuer challenges: %v", err)
		}
		if _, err := db.Exec(`DELETE FROM identity_actors WHERE id = $1`, activationTestIssuerID); err != nil {
			t.Errorf("clean activation test issuer: %v", err)
		}
	})
}

func TestActivationFunctionalConsumeWrongSurface(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)
	seedActivationTestIssuer(t, db)

	phone := "+967777000200"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version)
		VALUES ($1, $2, '', 'local-dsh', $3, '{field}', '[]', 'PROVISIONED', 1)`,
		actorID, "func_wrong_surf", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   activationTestIssuerID,
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
	seedActivationTestIssuer(t, db)

	phone := "+967777000201"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version)
		VALUES ($1, $2, '', 'local-dsh', $3, '{field}', '[]', 'PROVISIONED', 1)`,
		actorID, "func_revoked", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   activationTestIssuerID,
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
	seedActivationTestIssuer(t, db)

	phone := "+967777000202"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version)
		VALUES ($1, $2, '', 'local-dsh', $3, '{field}', '[]', 'PROVISIONED', 1)`,
		actorID, "func_expired", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   activationTestIssuerID,
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
	seedActivationTestIssuer(t, db)

	phone := "+967777000203"
	cleanupTestPhone(t, db, phone)
	actorID, err := randomToken(16)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.ExecContext(context.Background(), `
		INSERT INTO identity_actors (id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version)
		VALUES ($1, $2, '', 'local-dsh', $3, '{field}', '[]', 'PROVISIONED', 1)`,
		actorID, "func_lockout", phone)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	res, err := repo.IssueActivationForActor(context.Background(), actorID, IssueActivationForActorInput{
		IssuedByActorID:   activationTestIssuerID,
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

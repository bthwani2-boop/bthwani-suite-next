package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"testing"
	"time"
)

func insertDeviceBindingActor(t *testing.T, db *sql.DB, actorID, role, surface string) {
	t.Helper()
	_ = surface
	insertIdentityTestActor(t, db, actorID, actorID, "agent2-device-binding", "", []string{role}, nil, ActorStatusActive, 1)
}

func insertDeviceBindingSession(
	t *testing.T,
	db *sql.DB,
	actorID,
	sessionID,
	surface,
	fingerprint string,
) (string, string) {
	t.Helper()
	accessToken := sessionID + "-access"
	refreshRandom := sessionID + "-refresh-material-that-is-long-enough-for-testing"
	refreshToken := sessionID + "." + refreshRandom
	if _, err := db.Exec(`
		INSERT INTO identity_sessions
		    (id, actor_id, access_token_hash, refresh_token_hash,
		     device_fingerprint, surface, access_expires_at, refresh_expires_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8)`,
		sessionID,
		actorID,
		tokenHash(accessToken),
		tokenHash(refreshRandom),
		fingerprint,
		surface,
		time.Now().Add(15*time.Minute),
		time.Now().Add(24*time.Hour),
	); err != nil {
		t.Fatalf("insert device-binding session: %v", err)
	}
	return accessToken, refreshToken
}

func assertSessionCompromised(t *testing.T, db *sql.DB, sessionID string) {
	t.Helper()
	var revokedAt, compromisedAt sql.NullTime
	if err := db.QueryRow(`
		SELECT revoked_at, compromised_at
		FROM identity_sessions
		WHERE id = $1`, sessionID).Scan(&revokedAt, &compromisedAt); err != nil {
		t.Fatalf("read compromised session: %v", err)
	}
	if !revokedAt.Valid || !compromisedAt.Valid {
		t.Fatalf("session %q was not fail-closed: revoked=%v compromised=%v", sessionID, revokedAt.Valid, compromisedAt.Valid)
	}
}

func TestRefreshGovernedForDeviceBindsMobileRefreshAndPreservesBFFSessionPolicy(t *testing.T) {
	db := openIdentityTestDB(t)
	repository := NewRepository(db)

	prefix := strings.ToLower(strings.ReplaceAll(t.Name(), "/", "-"))
	prefix = strings.ReplaceAll(prefix, "_", "-")
	if len(prefix) > 36 {
		prefix = prefix[len(prefix)-36:]
	}
	actorIDs := []string{
		"agent2-device-ok-" + prefix,
		"agent2-device-missing-" + prefix,
		"agent2-device-wrong-" + prefix,
		"agent2-device-bff-" + prefix,
	}
	for _, actorID := range actorIDs {
		_, _ = db.Exec(`DELETE FROM identity_actors WHERE id = $1`, actorID)
	}
	t.Cleanup(func() {
		for _, actorID := range actorIDs {
			_, _ = db.Exec(`DELETE FROM identity_actors WHERE id = $1`, actorID)
		}
	})

	t.Run("matching mobile device rotates", func(t *testing.T) {
		actorID := actorIDs[0]
		insertDeviceBindingActor(t, db, actorID, "client", "app-client")
		sessionID := "agent2-mobile-ok-" + prefix
		_, refreshToken := insertDeviceBindingSession(t, db, actorID, sessionID, "app-client", "client-device:alpha")

		pair, err := repository.RefreshGovernedForDevice(context.Background(), refreshToken, "client-device:alpha")
		if err != nil {
			t.Fatalf("matching device refresh failed: %v", err)
		}
		if pair.RefreshToken == refreshToken || pair.AccessToken == "" {
			t.Fatalf("refresh did not rotate token pair: %#v", pair)
		}
	})

	t.Run("missing mobile device revokes compromised session", func(t *testing.T) {
		actorID := actorIDs[1]
		insertDeviceBindingActor(t, db, actorID, "partner", "app-partner")
		sessionID := "agent2-mobile-missing-" + prefix
		_, refreshToken := insertDeviceBindingSession(t, db, actorID, sessionID, "app-partner", "partner-device:alpha")

		_, err := repository.RefreshGovernedForDevice(context.Background(), refreshToken, "")
		if !errors.Is(err, ErrDeviceFingerprintRequired) {
			t.Fatalf("missing device error = %v, want %v", err, ErrDeviceFingerprintRequired)
		}
		assertSessionCompromised(t, db, sessionID)
	})

	t.Run("wrong mobile device revokes compromised session", func(t *testing.T) {
		actorID := actorIDs[2]
		insertDeviceBindingActor(t, db, actorID, "captain", "app-captain")
		sessionID := "agent2-mobile-wrong-" + prefix
		_, refreshToken := insertDeviceBindingSession(t, db, actorID, sessionID, "app-captain", "captain-device:alpha")

		_, err := repository.RefreshGovernedForDevice(context.Background(), refreshToken, "captain-device:other")
		if !errors.Is(err, ErrDeviceFingerprintMismatch) {
			t.Fatalf("wrong device error = %v, want %v", err, ErrDeviceFingerprintMismatch)
		}
		assertSessionCompromised(t, db, sessionID)
	})

	t.Run("control panel BFF does not require mobile device proof", func(t *testing.T) {
		actorID := actorIDs[3]
		insertDeviceBindingActor(t, db, actorID, "operator", "control-panel")
		sessionID := "agent2-bff-" + prefix
		_, refreshToken := insertDeviceBindingSession(t, db, actorID, sessionID, "control-panel", "control-panel-bff")

		pair, err := repository.RefreshGoverned(context.Background(), refreshToken)
		if err != nil {
			t.Fatalf("control-panel refresh regressed: %v", err)
		}
		if pair.RefreshToken == refreshToken {
			t.Fatal("control-panel refresh did not rotate")
		}
	})

	for _, actorID := range actorIDs {
		var drift bool
		err := db.QueryRow(`
			SELECT roles IS DISTINCT FROM identity_effective_roles(id)
			    OR permissions IS DISTINCT FROM identity_effective_permissions(id)
			FROM identity_actors WHERE id = $1`, actorID).Scan(&drift)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			t.Fatalf("read access projection for %s: %v", actorID, err)
		}
		if err == nil && drift {
			t.Fatalf("device-binding test exposed access projection drift for %s", actorID)
		}
	}
}

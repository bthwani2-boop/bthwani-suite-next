package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"
)

func openIdentityDBIntegration(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for Identity database integration tests")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.PingContext(t.Context()); err != nil {
		if closeErr := db.Close(); closeErr != nil {
			t.Fatalf("close Identity database after failed ping: %v (ping: %v)", closeErr, err)
		}
		t.Skipf("Identity database is unavailable: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close Identity database: %v", err)
		}
	})
	return db
}

func hasPermissionScope(permissions []Permission, scope string) bool {
	for _, permission := range permissions {
		if permission.Service == "dsh" && permission.Surface == "app-partner" && permission.Scope == scope {
			return true
		}
	}
	return false
}

func loadActorAccessState(t *testing.T, db *sql.DB, actorID string) (bool, []Permission) {
	t.Helper()
	var status ActorLifecycleStatus
	var raw []byte
	if err := db.QueryRow(`SELECT status, permissions FROM identity_actors WHERE id = $1`, actorID).Scan(&status, &raw); err != nil {
		t.Fatal(err)
	}
	var permissions []Permission
	if err := json.Unmarshal(raw, &permissions); err != nil {
		t.Fatal(err)
	}
	return status == ActorStatusActive, permissions
}

func insertLiveIdentitySession(t *testing.T, db *sql.DB, actorID, suffix string) string {
	t.Helper()
	sessionID := "session-j022-" + suffix
	_, err := db.Exec(`
		INSERT INTO identity_sessions (
			id, actor_id, access_token_hash, refresh_token_hash,
			device_fingerprint, access_expires_at, refresh_expires_at
		) VALUES ($1, $2, $3, $4, 'j022-device', now() + interval '1 hour', now() + interval '24 hours')`,
		sessionID,
		actorID,
		"access-j022-"+suffix,
		"refresh-j022-"+suffix,
	)
	if err != nil {
		t.Fatal(err)
	}
	return sessionID
}

func assertSessionRevoked(t *testing.T, db *sql.DB, sessionID string) {
	t.Helper()
	var revoked bool
	if err := db.QueryRow(`SELECT revoked_at IS NOT NULL FROM identity_sessions WHERE id = $1`, sessionID).Scan(&revoked); err != nil {
		t.Fatal(err)
	}
	if !revoked {
		t.Fatalf("session %s retained stale partner authority", sessionID)
	}
}

func TestPartnerStoreAccessChangeRevokesSessionsAndPreservesOtherStoresDBIntegration(t *testing.T) {
	db := openIdentityDBIntegration(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	actorID := "partner-j022-" + suffix
	operatorContextID := "operator-j022-" + suffix
	phone := "+9677" + suffix[len(suffix)-8:]
	permissions := append(
		PartnerBundlePermissions("manager", "store-j022-a-"+suffix),
		PartnerBundlePermissions("staff", "store-j022-b-"+suffix)...,
	)
	insertIdentityTestActor(t, db, actorID, "partner-j022-user-"+suffix, operatorContextID, phone, []string{"partner"}, permissions, ActorStatusActive, 1)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM identity_actors WHERE id = $1`, actorID) })

	repository := NewRepository(db)
	var err error
	firstSession := insertLiveIdentitySession(t, db, actorID, "a-"+suffix)
	_, err = repository.SetPartnerStoreAccess(context.Background(), actorID, PartnerStoreAccessInput{
		StoreID:           "store-j022-a-" + suffix,
		OperatorContextID: operatorContextID,
		Enabled:           false,
	})
	if err != nil {
		t.Fatal(err)
	}
	assertSessionRevoked(t, db, firstSession)
	active, effective := loadActorAccessState(t, db, actorID)
	if !active {
		t.Fatal("actor with another store assignment was incorrectly disabled")
	}
	if hasPermissionScope(effective, "store:store-j022-a-"+suffix) {
		t.Fatal("revoked store authority survived")
	}
	if !hasPermissionScope(effective, "store:store-j022-b-"+suffix) {
		t.Fatal("unrelated store authority was removed")
	}

	secondSession := insertLiveIdentitySession(t, db, actorID, "b-"+suffix)
	_, err = repository.SetPartnerStoreAccess(context.Background(), actorID, PartnerStoreAccessInput{
		StoreID:           "store-j022-b-" + suffix,
		OperatorContextID: operatorContextID,
		Enabled:           false,
	})
	if err != nil {
		t.Fatal(err)
	}
	assertSessionRevoked(t, db, secondSession)
	active, effective = loadActorAccessState(t, db, actorID)
	if active {
		t.Fatal("partner-only actor stayed active after losing the final store scope")
	}
	if hasAnyPartnerStorePermission(effective) {
		t.Fatalf("partner retained store authority after final revocation: %#v", effective)
	}

	_, err = repository.SetPartnerStoreAccess(context.Background(), actorID, PartnerStoreAccessInput{
		StoreID:           "store-j022-b-" + suffix,
		PermissionBundle:  "staff",
		OperatorContextID: operatorContextID,
		Enabled:           true,
		Reactivate:        false,
	})
	if err != nil {
		t.Fatal(err)
	}
	active, effective = loadActorAccessState(t, db, actorID)
	if active {
		t.Fatal("resend-style access restoration activated the actor before code consumption")
	}
	if !hasPermissionScope(effective, "store:store-j022-b-"+suffix) {
		t.Fatal("resend-style restoration failed to restore the intended store scope")
	}

	_, err = repository.SetPartnerStoreAccess(context.Background(), actorID, PartnerStoreAccessInput{
		StoreID:           "store-j022-b-" + suffix,
		PermissionBundle:  "staff",
		OperatorContextID: operatorContextID,
		Enabled:           true,
		Reactivate:        true,
	})
	if err != nil {
		t.Fatal(err)
	}
	active, _ = loadActorAccessState(t, db, actorID)
	if !active {
		t.Fatal("explicit team activation did not restore the Identity actor")
	}
}

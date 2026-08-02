package identity

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"testing"
)

func cleanupJ002Actors(t *testing.T, db *sql.DB, phones ...string) {
	t.Helper()
	clean := func() {
		for _, phone := range phones {
			if _, err := db.Exec(`DELETE FROM identity_actors WHERE phone_e164 = $1`, phone); err != nil {
				t.Errorf("clean up J002 actor %s: %v", phone, err)
			}
		}
	}
	clean()
	t.Cleanup(clean)
}

func TestActorProvisionSearchReadbackDBIntegration(t *testing.T) {
	const (
		phone             = "+967700009201"
		otherPhone        = "+967700009202"
		username          = "j002.field.9201"
		operatorContextID = "local-dsh"
		foreignContextID  = "foreign-context"
	)
	db := openIdentityTestDB(t)
	cleanupJ002Actors(t, db, phone, otherPhone)
	repository := NewRepository(db)
	input := ProvisionActorInput{
		Username: username, PhoneE164: phone, Role: "field", OperatorContextID: operatorContextID,
	}

	created, err := repository.ProvisionActorGoverned(context.Background(), input)
	if err != nil {
		t.Fatalf("provision actor: %v", err)
	}
	if created.ActorID == "" || created.Status != ActorStatusProvisioned || created.Active {
		t.Fatalf("unexpected provisioned actor: %#v", created)
	}
	replayed, err := repository.ProvisionActorGoverned(context.Background(), input)
	if err != nil || replayed.ActorID != created.ActorID {
		t.Fatalf("identical replay was not idempotent: created=%#v replayed=%#v err=%v", created, replayed, err)
	}

	roleMismatch := input
	roleMismatch.Role = "captain"
	if _, err := repository.ProvisionActorGoverned(context.Background(), roleMismatch); !errors.Is(err, ErrProvisionConflict) {
		t.Fatalf("role-changing replay must conflict, got %v", err)
	}
	usernameMismatch := input
	usernameMismatch.Username = "j002.field.other"
	if _, err := repository.ProvisionActorGoverned(context.Background(), usernameMismatch); !errors.Is(err, ErrProvisionConflict) {
		t.Fatalf("username-changing replay must conflict, got %v", err)
	}
	duplicateUsername := input
	duplicateUsername.PhoneE164 = otherPhone
	if _, err := repository.ProvisionActorGoverned(context.Background(), duplicateUsername); !errors.Is(err, ErrUsernameTaken) {
		t.Fatalf("canonical username reuse must conflict, got %v", err)
	}

	readback, err := repository.ActorAdminByIDGoverned(context.Background(), operatorContextID, created.ActorID)
	if err != nil || readback.ActorID != created.ActorID || readback.PhoneE164 != phone {
		t.Fatalf("governed readback mismatch: %#v err=%v", readback, err)
	}
	if _, err := repository.ActorAdminByIDGoverned(context.Background(), foreignContextID, created.ActorID); !errors.Is(err, ErrActorNotFound) {
		t.Fatalf("cross-context read must be indistinguishable from not found, got %v", err)
	}

	page, err := repository.SearchActorsGoverned(context.Background(), ActorSearchInput{
		OperatorContextID: operatorContextID, Role: "field", Query: phone,
		Status: ActorStatusProvisioned, Limit: 10,
	})
	if err != nil || page.Total != 1 || len(page.Items) != 1 || page.Items[0].ActorID != created.ActorID {
		t.Fatalf("governed search mismatch: %#v err=%v", page, err)
	}
	foreignPage, err := repository.SearchActorsGoverned(context.Background(), ActorSearchInput{
		OperatorContextID: foreignContextID, Query: phone, Limit: 10,
	})
	if err != nil || foreignPage.Total != 0 || len(foreignPage.Items) != 0 {
		t.Fatalf("cross-context search leaked actor: %#v err=%v", foreignPage, err)
	}

	var count int
	if err := db.QueryRow(`SELECT count(*) FROM identity_actors WHERE phone_e164 = $1`, phone).Scan(&count); err != nil {
		t.Fatalf("count provisioned actor: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one durable actor after replay, got %d", count)
	}
}

func TestActorProvisionConcurrentReplayDBIntegration(t *testing.T) {
	const phone = "+967700009203"
	db := openIdentityTestDB(t)
	cleanupJ002Actors(t, db, phone)
	db.SetMaxOpenConns(16)
	repository := NewRepository(db)
	input := ProvisionActorInput{
		Username: "j002.concurrent.9203", PhoneE164: phone, Role: "captain", OperatorContextID: "local-dsh",
	}

	const callers = 12
	actorIDs := make(chan string, callers)
	errorsCh := make(chan error, callers)
	var waitGroup sync.WaitGroup
	for index := 0; index < callers; index++ {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			view, err := repository.ProvisionActorGoverned(context.Background(), input)
			if err != nil {
				errorsCh <- err
				return
			}
			actorIDs <- view.ActorID
		}()
	}
	waitGroup.Wait()
	close(actorIDs)
	close(errorsCh)
	for err := range errorsCh {
		t.Fatalf("concurrent idempotent provision failed: %v", err)
	}
	var expectedActorID string
	for actorID := range actorIDs {
		if expectedActorID == "" {
			expectedActorID = actorID
		}
		if actorID != expectedActorID {
			t.Fatalf("concurrent replay created divergent actor ids: first=%s current=%s", expectedActorID, actorID)
		}
	}

	var count int
	if err := db.QueryRow(`SELECT count(*) FROM identity_actors WHERE phone_e164 = $1`, phone).Scan(&count); err != nil {
		t.Fatalf("count concurrent actor: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one actor after %d concurrent replays, got %d", callers, count)
	}
}

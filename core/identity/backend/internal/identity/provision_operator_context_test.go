package identity

import (
	"context"
	"errors"
	"testing"
)

func TestProvisionActorRejectsMissingOperatorContextBeforeDatabaseAccess(t *testing.T) {
	repo := &Repository{}

	view, err := repo.ProvisionActorGoverned(context.Background(), ProvisionActorInput{
		Username:  "field-without-OperatorContext",
		PhoneE164: "+967777123456",
		Role:      "field",
	})
	if !errors.Is(err, ErrInvalidActivation) {
		t.Fatalf("missing trusted OperatorContext must be rejected before database access, view=%#v err=%v", view, err)
	}
}

func TestProvisionActorRejectsExistingPhoneFromDifferentOperatorContext(t *testing.T) {
	phone := "+967777123457"
	repo := newTestRepository(t, nil)
	fakeDriverInst.setActors(t.Name(), map[string]Actor{
		phone: {
			ID:                "field-OperatorContext-a",
			Username:          "field-a",
			OperatorContextID: "OperatorContext-a",
			PhoneE164:         phone,
			Roles:             []string{"field"},
			Permissions: []Permission{
				{Service: "dsh", Surface: "app-field", Action: "store:read", Scope: "assigned"},
			},
			Status: ActorStatusProvisioned, Version: 1,
		},
	})

	view, err := repo.ProvisionActorGoverned(context.Background(), ProvisionActorInput{
		Username:          "field-OperatorContext-b",
		PhoneE164:         phone,
		Role:              "field",
		OperatorContextID: "OperatorContext-b",
	})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("cross-OperatorContext phone reuse must be forbidden, view=%#v err=%v", view, err)
	}
}

func TestNormalizeUsernameCanonicalizesCaseAndWhitespace(t *testing.T) {
	username, err := NormalizeUsername("  Field.Agent_01 ")
	if err != nil {
		t.Fatalf("normalize username: %v", err)
	}
	if username != "field.agent_01" {
		t.Fatalf("unexpected username %q", username)
	}
}

func TestProvisionActorRejectsMismatchedIdempotentFingerprint(t *testing.T) {
	phone := "+967777123458"
	repo := newTestRepository(t, nil)
	fakeDriverInst.setActors(t.Name(), map[string]Actor{
		phone: {
			ID: "field-one", Username: "field-one", OperatorContextID: "OperatorContext-main",
			PhoneE164: phone, Roles: []string{"field"}, Status: ActorStatusProvisioned, Version: 1,
		},
	})

	view, err := repo.ProvisionActorGoverned(context.Background(), ProvisionActorInput{
		Username: "field-two", PhoneE164: phone, Role: "field", OperatorContextID: "OperatorContext-main",
	})
	if !errors.Is(err, ErrProvisionConflict) {
		t.Fatalf("mismatched retry must conflict, view=%#v err=%v", view, err)
	}
}

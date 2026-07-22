package clientaddress

import (
	"errors"
	"testing"
)

func TestFingerprintMutationIsDeterministicAndRequestSensitive(t *testing.T) {
	t.Parallel()

	first, err := fingerprintMutation(struct {
		AddressID       string `json:"addressId"`
		ExpectedVersion int    `json:"expectedVersion"`
	}{AddressID: "addr-1", ExpectedVersion: 4})
	if err != nil {
		t.Fatalf("fingerprint first request: %v", err)
	}
	second, err := fingerprintMutation(struct {
		AddressID       string `json:"addressId"`
		ExpectedVersion int    `json:"expectedVersion"`
	}{AddressID: "addr-1", ExpectedVersion: 4})
	if err != nil {
		t.Fatalf("fingerprint second request: %v", err)
	}
	changed, err := fingerprintMutation(struct {
		AddressID       string `json:"addressId"`
		ExpectedVersion int    `json:"expectedVersion"`
	}{AddressID: "addr-1", ExpectedVersion: 5})
	if err != nil {
		t.Fatalf("fingerprint changed request: %v", err)
	}

	if first != second {
		t.Fatalf("same mutation produced different fingerprints: %q != %q", first, second)
	}
	if first == changed {
		t.Fatal("different expected version produced the same fingerprint")
	}
	if len(first) != 64 {
		t.Fatalf("fingerprint length = %d, want 64", len(first))
	}
}

func TestValidateMutationContextRejectsUnsafeRetryIdentity(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name            string
		clientID        string
		addressID       string
		expectedVersion int
		mutation        MutationContext
	}{
		{name: "missing client", addressID: "addr-1", expectedVersion: 1, mutation: MutationContext{IdempotencyKey: "address-update:key"}},
		{name: "missing address", clientID: "client-1", expectedVersion: 1, mutation: MutationContext{IdempotencyKey: "address-update:key"}},
		{name: "missing version", clientID: "client-1", addressID: "addr-1", mutation: MutationContext{IdempotencyKey: "address-update:key"}},
		{name: "short key", clientID: "client-1", addressID: "addr-1", expectedVersion: 1, mutation: MutationContext{IdempotencyKey: "short"}},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if err := validateMutationContext(test.clientID, test.addressID, test.expectedVersion, test.mutation); !errors.Is(err, ErrInvalid) {
				t.Fatalf("error = %v, want ErrInvalid", err)
			}
		})
	}
}

func TestValidateMutationContextAcceptsVersionedMutation(t *testing.T) {
	t.Parallel()

	err := validateMutationContext(
		"client-1",
		"addr-1",
		3,
		MutationContext{IdempotencyKey: "address-delete:addr-1:v3", CorrelationID: "corr-1"},
	)
	if err != nil {
		t.Fatalf("expected valid mutation context, got %v", err)
	}
}

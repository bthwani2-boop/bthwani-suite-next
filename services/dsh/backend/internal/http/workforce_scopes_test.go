package http

import (
	"encoding/json"
	"testing"

	"dsh-api/internal/workforceclient"
)

func TestPublicWorkforceScopeSnapshotDoesNotExposeInternalContext(t *testing.T) {
	payload, err := json.Marshal(publicWorkforceScopeSnapshotFromInternal(&workforceclient.ActorScopes{
		ActorID:           "field-1",
		Role:              "field",
		OperatorContextID: "operator-1",
		StoreIDs:          []string{"store-1"},
		ServiceAreaCodes:  []string{"sanaa"},
		PartnerIDs:        []string{"partner-1"},
		ShiftCodes:        []string{"morning"},
	}))
	if err != nil {
		t.Fatalf("marshal public scope snapshot: %v", err)
	}
	var fields map[string]any
	if err := json.Unmarshal(payload, &fields); err != nil {
		t.Fatalf("decode public scope snapshot: %v", err)
	}
	if fields["actorRole"] != "field" {
		t.Fatalf("public scope snapshot actorRole = %v, want field", fields["actorRole"])
	}
	if _, present := fields["role"]; present {
		t.Fatal("public scope snapshot must not expose internal role field")
	}
	if _, present := fields["operatorContextId"]; present {
		t.Fatal("public scope snapshot must not expose trusted operator context")
	}
}

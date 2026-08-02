package workforceclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetActorScopesUsesTrustedServiceHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/assignments/field-1/scopes" || r.URL.Query().Get("role") != "field" {
			t.Fatalf("unexpected scopes request %s?%s", r.URL.Path, r.URL.RawQuery)
		}
		if r.URL.Query().Has("operatorContextId") {
			t.Fatal("operator context must not be sent in the query")
		}
		if r.Header.Get("Authorization") != "Bearer dsh-workforce-token" || r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatal("missing authenticated DSH service identity")
		}
		if r.Header.Get("X-Operator-Context-ID") != "trusted-context" {
			t.Fatalf("missing trusted context header: %q", r.Header.Get("X-Operator-Context-ID"))
		}
		_ = json.NewEncoder(w).Encode(ActorScopes{
			ActorID: "field-1", Role: "field", OperatorContextID: "trusted-context", StoreIDs: []string{"store-1"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "dsh-workforce-token")
	scopes, err := client.GetActorScopes(context.Background(), "field-1", "trusted-context", "field")
	if err != nil {
		t.Fatalf("get actor scopes: %v", err)
	}
	if scopes.OperatorContextID != "trusted-context" || len(scopes.StoreIDs) != 1 || scopes.StoreIDs[0] != "store-1" {
		t.Fatalf("unexpected scopes response: %#v", scopes)
	}
}

func TestGetActorScopesFailsClosedWithoutTrustedInputs(t *testing.T) {
	client := NewClient("", "")
	if _, err := client.GetActorScopes(context.Background(), "field-1", "context", "field"); err == nil {
		t.Fatal("unconfigured workforce client must fail closed")
	}
	configured := NewClient("http://workforce.invalid", "token")
	if _, err := configured.GetActorScopes(context.Background(), "field-1", "", "field"); err == nil {
		t.Fatal("missing trusted operator context must fail closed")
	}
}

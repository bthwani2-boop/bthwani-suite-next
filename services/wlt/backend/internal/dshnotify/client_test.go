package dshnotify

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNotifyIncludesTenantForSpecialRequestEvents(t *testing.T) {
	var payload map[string]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	specialRequestID := "special-1"
	client := NewClient(server.URL, "service-token")
	err := client.Notify(context.Background(), "tenant-a", nil, &specialRequestID, "session-1", "captured")
	if err != nil {
		t.Fatalf("Notify failed: %v", err)
	}
	if payload["tenantId"] != "tenant-a" {
		t.Fatalf("expected tenantId tenant-a, got %q", payload["tenantId"])
	}
	if payload["specialRequestId"] != specialRequestID {
		t.Fatalf("expected specialRequestId %s, got %q", specialRequestID, payload["specialRequestId"])
	}
}

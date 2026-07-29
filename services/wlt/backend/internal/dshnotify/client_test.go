package dshnotify

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNotifyIncludesOperatorContextForSpecialRequestEvents(t *testing.T) {
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
	err := client.Notify(context.Background(), "OperatorContext-a", nil, &specialRequestID, "session-1", "captured")
	if err != nil {
		t.Fatalf("Notify failed: %v", err)
	}
	if payload["operatorContextId"] != "OperatorContext-a" {
		t.Fatalf("expected operatorContextId OperatorContext-a, got %q", payload["operatorContextId"])
	}
	if payload["specialRequestId"] != specialRequestID {
		t.Fatalf("expected specialRequestId %s, got %q", specialRequestID, payload["specialRequestId"])
	}
}

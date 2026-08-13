package wlt

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func captainTopUpReadbackJSON(clientID string) string {
	return `{"paymentSession":{"id":"topup-session-1","clientId":"` + clientID + `","topupActorType":"captain","financialPurpose":"captain_topup","paymentMethod":"official_wallet","status":"authorized","amountMinorUnits":5000,"currency":"YER"}}`
}

func TestCreateCaptainTopUpSessionBindsActorAndMutationHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/wlt/topup-sessions" {
			t.Fatalf("request=%s %s, want POST /wlt/topup-sessions", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer service-token" {
			t.Fatalf("authorization=%q", got)
		}
		if got := r.Header.Get("X-Service-Caller"); got != "dsh" {
			t.Fatalf("service caller=%q", got)
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "operator-context-1" {
			t.Fatalf("operator context=%q", got)
		}
		if got := r.Header.Get("Idempotency-Key"); got != "idempotency-1" {
			t.Fatalf("idempotency=%q", got)
		}
		if got := r.Header.Get("X-Correlation-ID"); got != "correlation-1" {
			t.Fatalf("correlation=%q", got)
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if body["actorType"] != "captain" || body["actorId"] != "captain-1" || body["topupReference"] != "reference-1" {
			t.Fatalf("unexpected actor-bound body: %#v", body)
		}
		if body["amountMinorUnits"] != float64(5000) || body["currency"] != "YER" {
			t.Fatalf("unexpected amount body: %#v", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(captainTopUpReadbackJSON("captain-1")))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	status, body, err := client.CreateCaptainTopUpSession(
		WithOperatorContext(t.Context(), "operator-context-1"), "captain-1", "reference-1", 5000, "yer",
		"correlation-1", "idempotency-1", "operator-context-1",
	)
	if err != nil {
		t.Fatalf("CreateCaptainTopUpSession: %v", err)
	}
	if status != http.StatusOK || !bytes.Contains(body, []byte("captain_topup")) {
		t.Fatalf("status/body=%d/%s", status, body)
	}
}

func TestReadCaptainTopUpSessionRejectsAnotherCaptain(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/wlt/payment-sessions/topup-session-1" {
			t.Fatalf("request=%s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(captainTopUpReadbackJSON("captain-victim")))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	status, _, err := client.ReadCaptainTopUpSession(
		WithOperatorContext(t.Context(), "operator-context-1"), "topup-session-1", "captain-attacker", "correlation-2", "operator-context-1",
	)
	if !errors.Is(err, ErrCaptainTopUpNotOwned) {
		t.Fatalf("err=%v, want ErrCaptainTopUpNotOwned", err)
	}
	if status != http.StatusNotFound {
		t.Fatalf("status=%d, want 404", status)
	}
}

func TestMutateCaptainTopUpSessionReadsOwnershipBeforePosting(t *testing.T) {
	requests := make([]string, 0, 2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests = append(requests, r.Method+" "+r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		switch len(requests) {
		case 1:
			if r.Method != http.MethodGet || r.URL.Path != "/wlt/payment-sessions/topup-session-1" {
				t.Fatalf("first request=%s %s", r.Method, r.URL.Path)
			}
			_, _ = w.Write([]byte(captainTopUpReadbackJSON("captain-1")))
		case 2:
			if r.Method != http.MethodPost || r.URL.Path != "/wlt/topup-sessions/topup-session-1/capture" {
				t.Fatalf("second request=%s %s", r.Method, r.URL.Path)
			}
			if got := r.Header.Get("Idempotency-Key"); got != "capture-idempotency" {
				t.Fatalf("idempotency=%q", got)
			}
			if got := r.Header.Get("X-Correlation-ID"); got != "capture-correlation" {
				t.Fatalf("correlation=%q", got)
			}
			payload, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("read mutation body: %v", err)
			}
			if !bytes.Equal(bytes.TrimSpace(payload), []byte("{}")) {
				t.Fatalf("mutation body=%q, want {}", payload)
			}
			_, _ = w.Write([]byte(captainTopUpReadbackJSON("captain-1")))
		default:
			t.Fatalf("unexpected request %s", requests[len(requests)-1])
		}
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	status, body, err := client.MutateCaptainTopUpSession(
		WithOperatorContext(t.Context(), "operator-context-1"), "topup-session-1", "capture", "capture-correlation",
		"capture-idempotency", "captain-1", "operator-context-1",
	)
	if err != nil {
		t.Fatalf("MutateCaptainTopUpSession: %v", err)
	}
	if status != http.StatusOK || !bytes.Contains(body, []byte("topup-session-1")) {
		t.Fatalf("status/body=%d/%s", status, body)
	}
	if len(requests) != 2 {
		t.Fatalf("requests=%v, want ownership read then mutation", requests)
	}
}

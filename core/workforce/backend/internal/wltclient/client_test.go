package wltclient

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"workforce-api/internal/auth"
)

func configuredTestClient(server *httptest.Server) *Client {
	return NewClient(server.URL, "service-token")
}

func testContext() context.Context {
	return auth.WithOperatorContext(context.Background(), "context-a")
}

func TestPostAndReverseCarryEndToEndIdempotency(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		wantKey := "post-key"
		status := "posted"
		reversalKey := ""
		if r.URL.Path == "/wlt/provider-penalties/wpen-1/reverse" {
			wantKey = "reverse-key"
			status = "reversed"
			reversalKey = wantKey
		}
		if got := r.Header.Get("Idempotency-Key"); got != wantKey {
			t.Fatalf("idempotency key mismatch: got %q want %q", got, wantKey)
		}
		if got := r.Header.Get("X-Delegated-Operator-Context"); got != "context-a" {
			t.Fatalf("OperatorContext binding mismatch: %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"providerPenalty":{"id":"wpen-1","incidentId":"incident-1","providerActorId":"provider-1","providerActorType":"captain","policyId":"policy-1","status":"` + status + `","ledgerTransactionId":"ledger-1","idempotencyKey":"post-key","reversalIdempotencyKey":"` + reversalKey + `"}}`))
	}))
	defer server.Close()
	client := configuredTestClient(server)
	if _, err := client.PostPenaltySaga(testContext(), "post-key", "corr-1", PostPenaltyInput{}); err != nil {
		t.Fatalf("post penalty: %v", err)
	}
	if _, err := client.ReversePenaltySaga(testContext(), "wpen-1", "reverse-key", "corr-1", ReversePenaltyInput{}); err != nil {
		t.Fatalf("reverse penalty: %v", err)
	}
	if requests != 2 {
		t.Fatalf("unexpected request count: %d", requests)
	}
}

func TestMutationResponseLossIsUnknownNotDefinitiveFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hijacker := w.(http.Hijacker)
		conn, _, err := hijacker.Hijack()
		if err == nil {
			_ = conn.Close()
		}
	}))
	defer server.Close()
	_, err := configuredTestClient(server).PostPenaltySaga(testContext(), "post-key", "", PostPenaltyInput{})
	if !errors.Is(err, ErrOutcomeUnknown) {
		t.Fatalf("response loss must be UNKNOWN, got %v", err)
	}
}

func TestMutationTimeoutAfterDispatchIsUnknown(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()
	client := configuredTestClient(server)
	client.http.Timeout = 10 * time.Millisecond
	_, err := client.PostPenaltySaga(testContext(), "post-key", "", PostPenaltyInput{})
	if !errors.Is(err, ErrOutcomeUnknown) {
		t.Fatalf("timeout after dispatch must be UNKNOWN, got %v", err)
	}
}

func TestExplicitRemoteFailuresAreClassified(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		kind   error
	}{
		{name: "retryable 5xx", status: http.StatusServiceUnavailable, kind: ErrRetryable},
		{name: "governed 4xx", status: http.StatusForbidden, kind: ErrPermanent},
		{name: "authoritative absence", status: http.StatusNotFound, kind: ErrNotFound},
	} {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(`{"code":"TEST","message":"classified"}`))
			}))
			defer server.Close()
			client := configuredTestClient(server)
			var err error
			if tc.status == http.StatusNotFound {
				_, err = client.GetPenaltyByIncident(testContext(), "incident-1", "")
			} else {
				_, err = client.PostPenaltySaga(testContext(), "post-key", "", PostPenaltyInput{})
			}
			if !errors.Is(err, tc.kind) {
				t.Fatalf("status %d classified as %v, want %v", tc.status, err, tc.kind)
			}
		})
	}
}

func TestReadbackTransportFailureIsRetryableNotMutationUnknown(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	_ = listener.Close()
	client := NewClient("http://"+address, "service-token")
	client.http.Timeout = 50 * time.Millisecond
	_, err = client.GetPenaltyByIncident(testContext(), "incident-1", "")
	if !errors.Is(err, ErrRetryable) || errors.Is(err, ErrOutcomeUnknown) {
		t.Fatalf("readback transport failure classification is unsafe: %v", err)
	}
}

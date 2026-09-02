package wlt

import (
	"context"
	"dsh-api/internal/opctx"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNormalizeFinanceResponseRejectsInvalidSuccessBodies(t *testing.T) {
	op, err := Registry.GetOperation("finance.refunds.read")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name  string
		body  string
		ctype string
	}{
		{"html body", `<html>error</html>`, "application/json"},
		{"script-like payload", `{"refunds":[{"note":"<script>alert(1)</script>"}]}`, "application/json"},
		{"malformed json", `{"refunds":`, "application/json"},
		{"empty unexpected success body", "", "application/json"},
		{"schema-invalid success", `{"settlements":[]}`, "application/json"},
		{"unexpected content type", `{"refunds":[]}`, "text/html"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, _, err := normalizeFinanceResponse(op, http.StatusOK, tc.ctype, []byte(tc.body)); err == nil {
				t.Fatalf("expected rejection for %s", tc.name)
			}
		})
	}
}

func TestNormalizeFinanceResponseMapsUpstreamStatusesWithoutForwardingBodies(t *testing.T) {
	op, err := Registry.GetOperation("finance.refunds.read")
	if err != nil {
		t.Fatal(err)
	}
	for _, status := range []int{400, 401, 403, 404, 409} {
		gotStatus, body, err := normalizeFinanceResponse(op, status, "application/json", []byte(`{"code":"INTERNAL_CODE","message":"internal details"}`))
		if err != nil || gotStatus != status {
			t.Fatalf("status %d normalized to %d with err %v", status, gotStatus, err)
		}
		if strings.Contains(string(body), "INTERNAL_CODE") || strings.Contains(string(body), "internal details") {
			t.Fatalf("status %d leaked upstream error body: %s", status, body)
		}
	}
	for _, status := range []int{500, 502, 503} {
		gotStatus, body, err := normalizeFinanceResponse(op, status, "application/json", []byte(`{"code":"INTERNAL_CODE","message":"internal details"}`))
		if err != nil || gotStatus != http.StatusBadGateway {
			t.Fatalf("status %d normalized to %d with err %v", status, gotStatus, err)
		}
		if strings.Contains(string(body), "INTERNAL_CODE") || strings.Contains(string(body), "internal details") {
			t.Fatalf("status %d leaked upstream error body: %s", status, body)
		}
	}
}

func TestNormalizeFinanceResponseRejectsMalformedErrorEnvelope(t *testing.T) {
	op, err := Registry.GetOperation("finance.refunds.read")
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name   string
		status int
		body   string
	}{
		{"malformed 4xx", http.StatusBadRequest, `{"code":`},
		{"html 5xx", http.StatusBadGateway, `<html>gateway</html>`},
		{"missing fields", http.StatusServiceUnavailable, `{"message":"no code"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, _, err := normalizeFinanceResponse(op, tc.status, "application/json", []byte(tc.body)); err == nil {
				t.Fatal("expected malformed error envelope rejection")
			}
		})
	}
}

func TestNormalizeFinanceResponseEnforcesCanonicalNoContent(t *testing.T) {
	op, err := Registry.GetOperation("finance.payout_destinations.deactivate")
	if err != nil {
		t.Fatal(err)
	}
	if status, body, err := normalizeFinanceResponse(op, http.StatusNoContent, "", nil); err != nil || status != http.StatusNoContent || len(body) != 0 {
		t.Fatalf("expected canonical 204 no-content response, got status=%d body=%q err=%v", status, body, err)
	}
	for _, tc := range []struct {
		name        string
		status      int
		contentType string
		body        string
	}{
		{name: "wrong success status", status: http.StatusOK, contentType: "application/json"},
		{name: "body on no-content status", status: http.StatusNoContent, contentType: "application/json", body: `{"payoutDestination":{}}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, _, err := normalizeFinanceResponse(op, tc.status, tc.contentType, []byte(tc.body)); err == nil {
				t.Fatal("expected no-content contract rejection")
			}
		})
	}
}

func TestExecuteFinanceRejectsOversizedBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{"refunds": []map[string]string{{"id": strings.Repeat("x", maxFinanceProxyResponseBytes)}}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	ctx := opctx.WithOperatorContext(context.Background(), "operator-1")
	if _, _, err := client.ExecuteFinanceRead(ctx, "finance.refunds.read", nil, nil, "corr-1", "operator-1"); err == nil || !strings.Contains(err.Error(), "exceeds") {
		t.Fatalf("expected oversized-body rejection, got %v", err)
	}
}

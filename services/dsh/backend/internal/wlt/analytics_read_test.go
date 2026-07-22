package wlt

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestReadAnalyticsFinancialSnapshotIsAuthenticatedReadOnly(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("method=%s", r.Method)
		}
		if r.URL.Path != "/wlt/ledger/financial-summary" {
			t.Fatalf("path=%s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer service-token" {
			t.Fatalf("authorization=%q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("service caller=%q", r.Header.Get("X-Service-Caller"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"financialSummary":{"currencies":[{"currency":"YER","assetsMinorUnits":10,"liabilitiesMinorUnits":4,"revenueMinorUnits":2,"expensesMinorUnits":0,"netPositionMinorUnits":6,"accounts":[]}],"dataCompleteness":[]}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	snapshot, err := client.ReadAnalyticsFinancialSnapshot(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Owner != "WLT" || !snapshot.ReadOnly || snapshot.ReadState != "available" {
		t.Fatalf("snapshot=%+v", snapshot)
	}
	if snapshot.Summary == nil || len(snapshot.Summary.Currencies) != 1 {
		t.Fatalf("summary=%+v", snapshot.Summary)
	}
}

func TestReadAnalyticsFinancialSnapshotDoesNotFabricateZeroWhenUnavailable(t *testing.T) {
	client := NewClient("", "")
	snapshot, err := client.ReadAnalyticsFinancialSnapshot(context.Background())
	if err == nil {
		t.Fatal("expected configuration error")
	}
	if snapshot.ReadState != "unavailable" || snapshot.Summary != nil {
		t.Fatalf("snapshot=%+v", snapshot)
	}
}

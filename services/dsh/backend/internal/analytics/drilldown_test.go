package analytics

import (
	"strings"
	"testing"
)

func TestOrderOperationsDetailURLUsesCanonicalOperationsWorkspace(t *testing.T) {
	url := orderOperationsDetailURL("order id/with spaces")
	for _, expected := range []string{
		"/dsh/operations?",
		"workspace=live-orders",
		"subGroup=queue",
		"orderId=order+id%2Fwith+spaces",
		"panel=detail",
	} {
		if !strings.Contains(url, expected) {
			t.Fatalf("detail URL %q does not contain %q", url, expected)
		}
	}
}

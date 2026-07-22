package support

import "testing"

func TestJRN021IncidentTransitions(t *testing.T) {
	allowed := []struct {
		from IncidentStatus
		to   IncidentStatus
	}{
		{IncidentOpen, IncidentMonitoring},
		{IncidentOpen, IncidentResolved},
		{IncidentMonitoring, IncidentOpen},
		{IncidentMonitoring, IncidentResolved},
		{IncidentResolved, IncidentMonitoring},
	}
	for _, tc := range allowed {
		if !validIncidentTransition(tc.from, tc.to) {
			t.Fatalf("expected transition %s -> %s to be allowed", tc.from, tc.to)
		}
	}

	forbidden := []struct {
		from IncidentStatus
		to   IncidentStatus
	}{
		{IncidentResolved, IncidentOpen},
		{IncidentStatus("invalid"), IncidentOpen},
		{IncidentOpen, IncidentStatus("invalid")},
	}
	for _, tc := range forbidden {
		if validIncidentTransition(tc.from, tc.to) {
			t.Fatalf("expected transition %s -> %s to be forbidden", tc.from, tc.to)
		}
	}
}

func TestJRN021IncidentValidationVocabulary(t *testing.T) {
	for _, severity := range []IncidentSeverity{SeverityLow, SeverityMedium, SeverityHigh, SeverityCritical} {
		if !validIncidentSeverity(severity) {
			t.Fatalf("expected severity %s to be valid", severity)
		}
	}
	for _, scope := range []IncidentScope{ScopeDelivery, ScopeStores, ScopePayments, ScopePlatform, ScopeUnknown} {
		if !validIncidentScope(scope) {
			t.Fatalf("expected scope %s to be valid", scope)
		}
	}
	if validIncidentSeverity(IncidentSeverity("unknown")) {
		t.Fatal("unknown severity must be rejected")
	}
	if validIncidentScope(IncidentScope("finance_mutation")) {
		t.Fatal("finance mutation scope must not be accepted as DSH incident truth")
	}
}

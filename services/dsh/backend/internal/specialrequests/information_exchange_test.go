package specialrequests

import "testing"

func TestInformationExchangeValidationAndCanonicalStage(t *testing.T) {
	if _, err := validateInformationText("question", "short", 5); err != nil {
		t.Fatalf("valid question rejected: %v", err)
	}
	if _, err := validateInformationText("question", " no ", 5); err == nil {
		t.Fatal("short question must be rejected")
	}
	for _, requestType := range []RequestType{TypeSheinAssistedPurchase, TypeAwnakErrand} {
		rule, ok := stageRulesFor(requestType)["customer_information"]
		if !ok {
			t.Fatalf("%s missing customer_information stage", requestType)
		}
		if !stageMatchesStatus(rule, StatusNeedsCustomerInput) {
			t.Fatalf("%s customer_information must require needs_customer_input", requestType)
		}
	}
}

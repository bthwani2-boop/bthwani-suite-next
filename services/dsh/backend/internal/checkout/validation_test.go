package checkout

import "testing"

func TestDependencyValidationIssuesPreserveCanonicalCodesAndState(t *testing.T) {
	tests := []struct {
		name         string
		dependencies IntentDependencyValidation
		mode         FulfillmentMode
		addressID    string
		wantCodes    []string
		wantState    IntentState
	}{
		{
			name:         "ready delivery",
			dependencies: IntentDependencyValidation{CartReady: true, Serviceable: true},
			mode:         ModeBthwaniDelivery,
			addressID:    "address-1",
			wantState:    StateReady,
		},
		{
			name:         "blocked delivery defaults missing codes",
			dependencies: IntentDependencyValidation{},
			mode:         ModePartnerDelivery,
			wantCodes:    []string{"MISSING_ADDRESS", "CART_REQUIRES_REVIEW", "SERVICEABILITY_UNAVAILABLE"},
			wantState:    StateBlocked,
		},
		{
			name:         "blocked pickup uses governed codes",
			dependencies: IntentDependencyValidation{CartCode: "CART_EMPTY", ServiceabilityCode: "STORE_PAUSED"},
			mode:         ModePickup,
			wantCodes:    []string{"CART_EMPTY", "STORE_PAUSED"},
			wantState:    StateBlocked,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			issues := dependencyValidationIssues(tc.dependencies, tc.mode, tc.addressID)
			if len(issues) != len(tc.wantCodes) {
				t.Fatalf("issue count=%d, want %d: %#v", len(issues), len(tc.wantCodes), issues)
			}
			for index, wantCode := range tc.wantCodes {
				if issues[index].Code != wantCode {
					t.Fatalf("issue[%d].Code=%q, want %q", index, issues[index].Code, wantCode)
				}
			}
			if got := resolveIntentValidationState(issues); got != tc.wantState {
				t.Fatalf("state=%q, want %q", got, tc.wantState)
			}
		})
	}
}

func TestGeneratePreviewHashIsStableAndTupleBound(t *testing.T) {
	first := GeneratePreviewHash("cart-1", "address-1", ModeBthwaniDelivery, 3)
	if len(first) != 64 || first != GeneratePreviewHash("cart-1", "address-1", ModeBthwaniDelivery, 3) {
		t.Fatalf("preview hash is not stable SHA-256 hex: %q", first)
	}
	if first == GeneratePreviewHash("cart-1:address-1", "", ModeBthwaniDelivery, 3) || first == GeneratePreviewHash("cart-1", "address-1", ModePickup, 3) {
		t.Fatal("preview hash lost dependency tuple boundaries")
	}
}

func TestRefreshAndValidateRejectInvalidInputsBeforeDatabase(t *testing.T) {
	refreshCases := []RefreshIntentInput{
		{},
		{IntentID: "intent-1", OperatorContextID: "context-1", ClientID: "client-1", Mode: "unsupported"},
		{IntentID: "intent-1", OperatorContextID: "context-1", ClientID: "client-1", Mode: ModeBthwaniDelivery},
		{IntentID: "intent-1", OperatorContextID: "context-1", ClientID: "client-1", Mode: ModePickup, QuoteVersion: -1},
	}
	for index, input := range refreshCases {
		if _, err := RefreshIntent(nil, input); err != ErrInvalid {
			t.Fatalf("refresh case %d error=%v, want %v", index, err, ErrInvalid)
		}
	}
	if _, err := ValidateIntent(nil, "", "context-1", "client-1", IntentDependencyValidation{}); err != ErrInvalid {
		t.Fatalf("validate missing intent error=%v, want %v", err, ErrInvalid)
	}
	if _, err := ValidateIntent(nil, "intent-1", "", "client-1", IntentDependencyValidation{}); err != ErrInvalid {
		t.Fatalf("validate missing context error=%v, want %v", err, ErrInvalid)
	}
}

package partner

import "testing"

func TestAccessDirectiveForTeamAction(t *testing.T) {
	tests := []struct {
		action          string
		enabled         bool
		scopeActive     bool
		issueActivation bool
	}{
		{action: "activate", enabled: true, scopeActive: true},
		{action: "resend-invite", enabled: true, scopeActive: false, issueActivation: true},
		{action: "pause", enabled: false, scopeActive: false},
		{action: "block", enabled: false, scopeActive: false},
		{action: "cancel-invite", enabled: false, scopeActive: false},
	}
	for _, test := range tests {
		t.Run(test.action, func(t *testing.T) {
			directive := accessDirectiveForTeamAction(test.action)
			if !directive.syncIdentity || directive.identityEnable != test.enabled || directive.scopeActive != test.scopeActive || directive.issueActivation != test.issueActivation {
				t.Fatalf("unexpected directive for %s: %#v", test.action, directive)
			}
		})
	}
}

func TestUnknownTeamActionHasNoAuthorityDirective(t *testing.T) {
	if directive := accessDirectiveForTeamAction("delete"); directive.syncIdentity {
		t.Fatalf("unknown action must not mutate authority: %#v", directive)
	}
}

package partner

import "testing"

func TestTeamMemberActionInputValidate(t *testing.T) {
	t.Parallel()

	validActions := []string{"pause", "activate", "block", "resend-invite", "cancel-invite"}
	for _, action := range validActions {
		action := action
		t.Run(action, func(t *testing.T) {
			t.Parallel()
			if err := (TeamMemberActionInput{Action: action}).Validate(); err != nil {
				t.Fatalf("expected action %q to be valid: %v", action, err)
			}
		})
	}

	invalidActions := []string{"", "delete", "approve", " pause ", "ACTIVATE"}
	for _, action := range invalidActions {
		action := action
		t.Run("invalid_"+action, func(t *testing.T) {
			t.Parallel()
			if err := (TeamMemberActionInput{Action: action}).Validate(); err == nil {
				t.Fatalf("expected action %q to be rejected", action)
			}
		})
	}
}

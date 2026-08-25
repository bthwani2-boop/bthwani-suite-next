package administration

import (
	"strings"
	"testing"
)

func TestAuditRedactionDropsSensitiveValues(t *testing.T) {
	legacy := "request_id=request-1; action_type=staff_role_assignment; role_id=role-1; reason=phone +967700000000; note=secret token"
	redacted := redactAuditDetail(legacy)
	if redacted != "{}" {
		t.Fatalf("legacy free text must fail closed after migration, got %q", redacted)
	}
	for _, forbidden := range []string{"+967", "secret", "reason=", "note="} {
		if strings.Contains(redacted, forbidden) {
			t.Fatalf("redacted audit leaked %q in %q", forbidden, redacted)
		}
	}

	jsonDetail := `{"request_id":"request-2","role_id":"role-2","phone":"+967711111111","note":"credential"}`
	redacted = redactAuditDetail(jsonDetail)
	if redacted != `{"request_id":"request-2"}` {
		t.Fatalf("unexpected JSON redaction %q", redacted)
	}
}

func TestValidateRoleReviewSeparation(t *testing.T) {
	tests := []struct {
		name        string
		maker       string
		beneficiary string
		checker     string
		wantErr     bool
	}{
		{name: "pairwise distinct", maker: "maker", beneficiary: "beneficiary", checker: "checker", wantErr: false},
		{name: "maker is checker", maker: "checker", beneficiary: "beneficiary", checker: "checker", wantErr: true},
		{name: "beneficiary is checker", maker: "maker", beneficiary: "checker", checker: "checker", wantErr: true},
		{name: "maker is beneficiary", maker: "same", beneficiary: "same", checker: "checker", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateRoleReviewSeparation(tt.maker, tt.beneficiary, tt.checker)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateRoleReviewSeparation() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateRollbackReviewSeparation(t *testing.T) {
	tests := []struct {
		name            string
		maker           string
		beneficiary     string
		sourceChecker   string
		rollbackChecker string
		wantErr         bool
	}{
		{name: "pairwise distinct", maker: "rollback-maker", beneficiary: "beneficiary", sourceChecker: "source-checker", rollbackChecker: "rollback-checker", wantErr: false},
		{name: "rollback checker is maker", maker: "rollback-checker", beneficiary: "beneficiary", sourceChecker: "source-checker", rollbackChecker: "rollback-checker", wantErr: true},
		{name: "rollback checker is beneficiary", maker: "rollback-maker", beneficiary: "rollback-checker", sourceChecker: "source-checker", rollbackChecker: "rollback-checker", wantErr: true},
		{name: "rollback checker is original checker", maker: "rollback-maker", beneficiary: "beneficiary", sourceChecker: "rollback-checker", rollbackChecker: "rollback-checker", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateRollbackReviewSeparation(tt.maker, tt.beneficiary, tt.sourceChecker, tt.rollbackChecker)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateRollbackReviewSeparation() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

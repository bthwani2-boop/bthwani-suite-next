package testdb

import (
	"os"
	"strings"
	"testing"
)

func TestConfigureTrustedOperatorContextUsesCIFallback(t *testing.T) {
	t.Setenv("DSH_REQUIRE_DB_TESTS", "true")
	t.Setenv("CI", "true")
	t.Setenv("DSH_TEST_operator_context_id", "")
	t.Setenv("PGOPTIONS", "")

	ConfigureTrustedOperatorContext()

	if got := os.Getenv("DSH_TEST_operator_context_id"); got != "ci-dsh" {
		t.Fatalf("expected CI OperatorContext fallback ci-dsh, got %q", got)
	}
	if got := os.Getenv("PGOPTIONS"); !strings.Contains(got, "-c bthwani.operator_context_id=ci-dsh") {
		t.Fatalf("expected OperatorContext startup option, got %q", got)
	}
}

func TestConfigureTrustedOperatorContextRejectsConflictingOptions(t *testing.T) {
	t.Setenv("DSH_REQUIRE_DB_TESTS", "true")
	t.Setenv("CI", "true")
	t.Setenv("DSH_TEST_operator_context_id", "OperatorContext-a")
	t.Setenv("PGOPTIONS", "-c bthwani.operator_context_id=OperatorContext-b")

	defer func() {
		if recovered := recover(); recovered == nil {
			t.Fatal("expected conflicting PGOPTIONS OperatorContext context to panic")
		}
	}()

	ConfigureTrustedOperatorContext()
}

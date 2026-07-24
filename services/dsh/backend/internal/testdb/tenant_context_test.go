package testdb

import (
	"os"
	"strings"
	"testing"
)

func TestConfigureTrustedTenantContextUsesCIFallback(t *testing.T) {
	t.Setenv("DSH_REQUIRE_DB_TESTS", "true")
	t.Setenv("CI", "true")
	t.Setenv("DSH_TEST_TENANT_ID", "")
	t.Setenv("PGOPTIONS", "")

	ConfigureTrustedTenantContext()

	if got := os.Getenv("DSH_TEST_TENANT_ID"); got != "ci-dsh" {
		t.Fatalf("expected CI tenant fallback ci-dsh, got %q", got)
	}
	if got := os.Getenv("PGOPTIONS"); !strings.Contains(got, "-c bthwani.tenant_id=ci-dsh") {
		t.Fatalf("expected tenant startup option, got %q", got)
	}
}

func TestConfigureTrustedTenantContextRejectsConflictingOptions(t *testing.T) {
	t.Setenv("DSH_REQUIRE_DB_TESTS", "true")
	t.Setenv("CI", "true")
	t.Setenv("DSH_TEST_TENANT_ID", "tenant-a")
	t.Setenv("PGOPTIONS", "-c bthwani.tenant_id=tenant-b")

	defer func() {
		if recovered := recover(); recovered == nil {
			t.Fatal("expected conflicting PGOPTIONS tenant context to panic")
		}
	}()

	ConfigureTrustedTenantContext()
}

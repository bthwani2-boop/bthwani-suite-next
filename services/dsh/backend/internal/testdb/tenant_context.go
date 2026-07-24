package testdb

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

var tenantIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`)

// ConfigureTrustedTenantContext configures PostgreSQL startup options for DSH
// database integration tests before any sql.DB connection is opened.
//
// Production code never calls this helper. The fallback is allowed only inside
// GitHub CI when DSH_REQUIRE_DB_TESTS=true; local DB tests must provide an
// explicit DSH_TEST_TENANT_ID. github.com/lib/pq maps PGOPTIONS to PostgreSQL's
// startup "options" parameter, so every pooled test connection receives the
// same trusted tenant context.
func ConfigureTrustedTenantContext() {
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		return
	}

	tenantID := strings.TrimSpace(os.Getenv("DSH_TEST_TENANT_ID"))
	if tenantID == "" && os.Getenv("CI") == "true" {
		tenantID = "ci-dsh"
	}
	if tenantID == "" {
		panic("DSH_TEST_TENANT_ID is required when DSH_REQUIRE_DB_TESTS=true outside CI")
	}
	if !tenantIDPattern.MatchString(tenantID) {
		panic(fmt.Sprintf("invalid DSH_TEST_TENANT_ID %q", tenantID))
	}

	option := "-c bthwani.tenant_id=" + tenantID
	existing := strings.TrimSpace(os.Getenv("PGOPTIONS"))
	if strings.Contains(existing, "bthwani.tenant_id=") {
		if !strings.Contains(existing, "bthwani.tenant_id="+tenantID) {
			panic(fmt.Sprintf("PGOPTIONS contains a conflicting DSH tenant context: %q", existing))
		}
		return
	}
	if existing != "" {
		option = existing + " " + option
	}
	if err := os.Setenv("PGOPTIONS", option); err != nil {
		panic(fmt.Sprintf("configure DSH test tenant context: %v", err))
	}
}

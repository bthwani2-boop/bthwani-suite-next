package testdb

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

var operatorContextIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`)

// ConfigureTrustedOperatorContext configures PostgreSQL startup options for DSH
// database integration tests before any sql.DB connection is opened.
//
// Production code never calls this helper. The fallback is allowed only inside
// GitHub CI when DSH_REQUIRE_DB_TESTS=true; local DB tests must provide an
// explicit DSH_TEST_operator_context_id. github.com/lib/pq maps PGOPTIONS to PostgreSQL's
// startup "options" parameter, so every pooled test connection receives the
// same trusted OperatorContext context.
func ConfigureTrustedOperatorContext() {
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		return
	}

	operatorContextID := strings.TrimSpace(os.Getenv("DSH_TEST_operator_context_id"))
	if operatorContextID == "" && os.Getenv("CI") == "true" {
		operatorContextID = "ci-dsh"
	}
	if operatorContextID == "" {
		panic("DSH_TEST_operator_context_id is required when DSH_REQUIRE_DB_TESTS=true outside CI")
	}
	if !operatorContextIDPattern.MatchString(operatorContextID) {
		panic(fmt.Sprintf("invalid DSH_TEST_operator_context_id %q", operatorContextID))
	}
	if err := os.Setenv("DSH_TEST_operator_context_id", operatorContextID); err != nil {
		panic(fmt.Sprintf("publish DSH test OperatorContext context: %v", err))
	}

	option := "-c bthwani.operator_context_id=" + operatorContextID
	existing := strings.TrimSpace(os.Getenv("PGOPTIONS"))
	if strings.Contains(existing, "bthwani.operator_context_id=") {
		if !strings.Contains(existing, "bthwani.operator_context_id="+operatorContextID) {
			panic(fmt.Sprintf("PGOPTIONS contains a conflicting DSH OperatorContext context: %q", existing))
		}
		return
	}
	if existing != "" {
		option = existing + " " + option
	}
	if err := os.Setenv("PGOPTIONS", option); err != nil {
		panic(fmt.Sprintf("configure DSH test OperatorContext context: %v", err))
	}
}

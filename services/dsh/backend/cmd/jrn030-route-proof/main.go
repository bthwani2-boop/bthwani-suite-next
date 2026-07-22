package main

import (
	"fmt"
	"os"
	"strings"
)

type routeExpectation struct {
	file    string
	pattern string
	handler string
}

func main() {
	expectations := []routeExpectation{
		{file: "internal/http/server.go", pattern: "POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code", handler: "handleIssuePartnerCourierConnectionCode"},
		{file: "internal/http/server.go", pattern: "GET /dsh/partner/stores/{storeId}/courier-connections", handler: "handleListPartnerCourierConnections"},
		{file: "internal/http/server.go", pattern: "POST /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke", handler: "handleRevokePartnerCourierConnection"},
		{file: "internal/http/server.go", pattern: "POST /dsh/captain/partner-fleet/connect", handler: "handleCaptainConnectPartnerFleet"},
		{file: "internal/http/server.go", pattern: "GET /dsh/captain/partner-fleet/memberships", handler: "handleCaptainPartnerFleetMemberships"},
		{file: "internal/http/partner_fleet_membership_routes.go", pattern: "POST /dsh/captain/partner-fleet/memberships/{teamMemberId}/disconnect", handler: "handleCaptainDisconnectPartnerFleetMembership"},
		{file: "internal/http/partner_fleet_operator.go", pattern: "GET /dsh/operator/stores/{storeId}/partner-fleet", handler: "handleOperatorPartnerFleetSnapshot"},
	}

	cache := map[string]string{}
	for _, expectation := range expectations {
		content, ok := cache[expectation.file]
		if !ok {
			bytes, err := os.ReadFile(expectation.file)
			if err != nil {
				fail("read %s: %v", expectation.file, err)
			}
			content = string(bytes)
			cache[expectation.file] = content
		}
		if !strings.Contains(content, fmt.Sprintf("%q", expectation.pattern)) {
			fail("missing route pattern %q in %s", expectation.pattern, expectation.file)
		}
		if !strings.Contains(content, expectation.handler) {
			fail("missing production handler %q in %s", expectation.handler, expectation.file)
		}
	}

	mainBytes, err := os.ReadFile("cmd/dsh-api/main.go")
	if err != nil {
		fail("read composition root: %v", err)
	}
	mainSource := string(mainBytes)
	for _, registration := range []string{
		"RegisterPartnerFleetMembershipRoutes",
		"RegisterPartnerFleetOperatorRoutes",
	} {
		if !strings.Contains(mainSource, registration) {
			fail("composition root does not call %s", registration)
		}
	}

	fmt.Printf("JRN-030 route proof passed: %d governed routes bound to production handlers\n", len(expectations))
}

func fail(format string, values ...any) {
	fmt.Fprintf(os.Stderr, "JRN-030 route proof failed: "+format+"\n", values...)
	os.Exit(1)
}

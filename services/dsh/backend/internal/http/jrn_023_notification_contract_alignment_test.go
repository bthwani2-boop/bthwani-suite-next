package http

import (
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func readNotificationGovernanceFixture(t *testing.T, relative string) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve notification governance test location")
	}
	path := filepath.Clean(filepath.Join(filepath.Dir(currentFile), relative))
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(content)
}

func requireNotificationGovernanceSnippet(t *testing.T, content, snippet string) {
	t.Helper()
	if !strings.Contains(content, snippet) {
		t.Fatalf("notification governance chain is missing required snippet %q", snippet)
	}
}

func TestJRN023NotificationGovernanceContractAndRuntimeAlignment(t *testing.T) {
	t.Parallel()

	contract := readNotificationGovernanceFixture(t, "../../../contracts/dsh.notifications-governance.openapi.yaml")
	registry := readNotificationGovernanceFixture(t, "../../../contracts/contract-registry.ts")
	capabilities := readNotificationGovernanceFixture(t, "../../../capability-map.extensions.ts")
	frontendTypes := readNotificationGovernanceFixture(t, "../../../frontend/shared/notifications/notifications.types.ts")
	migration := readNotificationGovernanceFixture(t, "../../../database/migrations/dsh-088_notification_delivery_policy.sql")

	for _, snippet := range []string{
		"/dsh/operator/notifications/delivery-attempts:",
		"operationId: listDshNotificationDeliveryAttempts",
		"DshNotificationPreferencePolicy:",
		"DshPlatformNotificationPolicy:",
		"DshNotificationDeliveryAuditResponse:",
		"enum: [in_app, push]",
		"enum: [sent, retry_scheduled, dead_letter]",
	} {
		requireNotificationGovernanceSnippet(t, contract, snippet)
	}

	for _, snippet := range []string{
		"id: \"dsh-notifications-governance\"",
		"path: \"contracts/dsh.notifications-governance.openapi.yaml\"",
		"clientStrategy: \"STANDALONE_MANUAL_TYPED_ADAPTER\"",
		"adapterOwner: \"frontend/shared/notifications\"",
	} {
		requireNotificationGovernanceSnippet(t, registry, snippet)
	}

	for _, snippet := range []string{
		"id: \"dsh.notifications\"",
		"listDshNotificationDeliveryAttempts",
		"channel-preferences",
		"localized-templates",
		"retry-dead-letter",
	} {
		requireNotificationGovernanceSnippet(t, capabilities, snippet)
	}

	for _, snippet := range []string{
		"DshNotificationChannel = \"in_app\" | \"push\"",
		"quietHoursStart?: string | undefined",
		"deepLinkPattern: string",
		"DshNotificationDeliveryOutcome = \"sent\" | \"retry_scheduled\" | \"dead_letter\"",
	} {
		requireNotificationGovernanceSnippet(t, frontendTypes, snippet)
	}

	for _, snippet := range []string{
		"delivery_channels TEXT[]",
		"dsh_notification_channel_deliveries",
		"quiet_hours_start TIME",
		"title_ar TEXT",
		"deep_link_pattern TEXT",
	} {
		requireNotificationGovernanceSnippet(t, migration, snippet)
	}

	router := NewRouter(nil, nil, nil, nil)
	RegisterNotificationRoutes(router, nil, nil, nil, nil)
	request, err := http.NewRequest(http.MethodGet, "/dsh/operator/notifications/delivery-attempts", nil)
	if err != nil {
		t.Fatal(err)
	}
	_, pattern := router.Handler(request)
	if pattern != "GET /dsh/operator/notifications/delivery-attempts" {
		t.Fatalf("expected governed delivery audit route, got %q", pattern)
	}
}

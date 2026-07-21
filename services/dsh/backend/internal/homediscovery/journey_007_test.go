package homediscovery

import (
	"context"
	"testing"
)

func validJourney007AdminInput() AdminContentInput {
	from := "2026-07-22T08:00:00Z"
	until := "2026-07-23T08:00:00Z"
	return AdminContentInput{
		Title:             "عرض صالح",
		ImageURL:          "https://cdn.example.test/home.jpg",
		ActionType:        "store",
		ActionTarget:      "store-1001",
		SortOrder:         1,
		PublicationStatus: "published",
		PublishFrom:       &from,
		PublishUntil:      &until,
		ExpectedVersion:   1,
	}
}

func TestJourney007ValidatesGovernedPublication(t *testing.T) {
	input := validJourney007AdminInput()
	if err := validateAdminInput("banners", input); err != nil {
		t.Fatalf("expected valid content, got %v", err)
	}

	missingTarget := input
	missingTarget.ActionTarget = ""
	if err := validateAdminInput("banners", missingTarget); err == nil {
		t.Fatal("expected missing action target to fail")
	}

	badExternal := input
	badExternal.ActionType = "external"
	badExternal.ActionTarget = "javascript:alert(1)"
	if err := validateAdminInput("banners", badExternal); err == nil {
		t.Fatal("expected unsafe external URL to fail")
	}

	reversed := input
	from := "2026-07-23T08:00:00Z"
	until := "2026-07-22T08:00:00Z"
	reversed.PublishFrom = &from
	reversed.PublishUntil = &until
	if err := validateAdminInput("banners", reversed); err == nil {
		t.Fatal("expected reversed publication window to fail")
	}
}

func TestJourney007RequiresOptimisticConcurrencyVersion(t *testing.T) {
	input := validJourney007AdminInput()
	input.ExpectedVersion = 0
	if _, err := UpdateAdminContent(context.Background(), nil, "banners", "banner-1", "actor-1", "corr-12345678", input); err == nil {
		t.Fatal("expected update without expectedVersion to fail before database access")
	}
}

func TestJourney007RejectsInvalidTelemetryBeforeDatabaseAccess(t *testing.T) {
	if err := RecordHomeContentEvent(context.Background(), nil, HomeContentEventInput{
		EventType:   "unknown",
		ContentKind: "banners",
		ContentID:   "banner-1",
	}); err == nil {
		t.Fatal("expected invalid telemetry event type to fail")
	}
	if err := RecordHomeContentEvent(context.Background(), nil, HomeContentEventInput{
		EventType:   "click",
		ContentKind: "unknown",
		ContentID:   "banner-1",
	}); err == nil {
		t.Fatal("expected invalid telemetry content kind to fail")
	}
}

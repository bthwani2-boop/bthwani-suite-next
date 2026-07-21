package homediscovery

import (
	"context"
	"reflect"
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

func validJourney007Event() HomeContentEventInput {
	return HomeContentEventInput{
		EventType:       "impression",
		ContentKind:     "banners",
		ContentID:       "banner-1",
		ViewerRef:       "home.session-1234",
		CityCode:        "SANA-A",
		ServiceAreaCode: "SANA-A-01",
		AudienceSegment: "guest",
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

	badMedia := input
	badMedia.ImageURL = "javascript:alert(1)"
	if err := validateAdminInput("banners", badMedia); err == nil {
		t.Fatal("expected unsafe media URL to fail")
	}

	governedMedia := input
	governedMedia.ImageURL = "/dsh/public/media/asset-1/card"
	if err := validateAdminInput("banners", governedMedia); err != nil {
		t.Fatalf("expected governed DSH media URL, got %v", err)
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

func TestJourney007NormalizesTargeting(t *testing.T) {
	targeting, err := normalizeAdminTargeting(AdminTargeting{
		CityCodes:        []string{"TAIZ", "SANA-A", "TAIZ", ""},
		ServiceAreaCodes: []string{"SANA-A-01", "SANA-A-01"},
		AudienceSegments: []string{"authenticated", "guest", "guest"},
	})
	if err != nil {
		t.Fatalf("unexpected targeting error: %v", err)
	}
	if !reflect.DeepEqual(targeting.CityCodes, []string{"SANA-A", "TAIZ"}) {
		t.Fatalf("unexpected cities: %#v", targeting.CityCodes)
	}
	if !reflect.DeepEqual(targeting.ServiceAreaCodes, []string{"SANA-A-01"}) {
		t.Fatalf("unexpected service areas: %#v", targeting.ServiceAreaCodes)
	}
	if !reflect.DeepEqual(targeting.AudienceSegments, []string{"authenticated", "guest"}) {
		t.Fatalf("unexpected audiences: %#v", targeting.AudienceSegments)
	}

	if _, err := normalizeAdminTargeting(AdminTargeting{
		AudienceSegments: []string{"vip-fabricated"},
	}); err == nil {
		t.Fatal("expected unsupported audience segment to fail")
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
	invalidEvent := validJourney007Event()
	invalidEvent.EventType = "unknown"
	if err := RecordHomeContentEvent(context.Background(), nil, invalidEvent); err == nil {
		t.Fatal("expected invalid telemetry event type to fail")
	}

	invalidKind := validJourney007Event()
	invalidKind.ContentKind = "unknown"
	if err := RecordHomeContentEvent(context.Background(), nil, invalidKind); err == nil {
		t.Fatal("expected invalid telemetry content kind to fail")
	}

	invalidAudience := validJourney007Event()
	invalidAudience.AudienceSegment = "fabricated"
	if err := RecordHomeContentEvent(context.Background(), nil, invalidAudience); err == nil {
		t.Fatal("expected invalid telemetry audience to fail")
	}

	invalidViewer := validJourney007Event()
	invalidViewer.ViewerRef = "x"
	if err := RecordHomeContentEvent(context.Background(), nil, invalidViewer); err == nil {
		t.Fatal("expected invalid telemetry viewer reference to fail")
	}
}

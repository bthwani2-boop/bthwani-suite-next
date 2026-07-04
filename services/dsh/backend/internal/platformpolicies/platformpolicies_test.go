package platformpolicies

import "testing"

func TestCreateZoneRequiresNameAndCityCode(t *testing.T) {
	cases := [][2]string{
		{"", "SAN"},
		{"Downtown", ""},
	}
	for _, c := range cases {
		_, err := CreateZone(nil, c[0], c[1], "desc")
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for name=%q cityCode=%q, got %v", c[0], c[1], err)
		}
	}
}

func TestUpsertSlaRuleRequiresZoneAndCategory(t *testing.T) {
	cases := [][2]string{
		{"", "grocery"},
		{"zone-1", ""},
	}
	for _, c := range cases {
		_, err := UpsertSlaRule(nil, c[0], c[1], 30, 60, "admin-1")
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for zoneID=%q category=%q, got %v", c[0], c[1], err)
		}
	}
}

func TestUpsertCapacityConfigRequiresZoneID(t *testing.T) {
	_, err := UpsertCapacityConfig(nil, "", 100, 20, 80, "admin-1")
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for empty zoneID, got %v", err)
	}
}

package centralcatalog

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestValidateAttributeJSON(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name     string
		dataType string
		value    string
		valid    bool
	}{
		{name: "text", dataType: "text", value: `"كبير"`, valid: true},
		{name: "number", dataType: "number", value: `25.5`, valid: true},
		{name: "boolean", dataType: "boolean", value: `true`, valid: true},
		{name: "enum", dataType: "enum", value: `"red"`, valid: true},
		{name: "multi enum", dataType: "multi_enum", value: `["red","blue"]`, valid: true},
		{name: "wrong scalar", dataType: "number", value: `"25"`, valid: false},
		{name: "wrong multi enum", dataType: "multi_enum", value: `[1,2]`, valid: false},
		{name: "unknown type", dataType: "object", value: `{}`, valid: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateAttributeJSON(tc.dataType, json.RawMessage(tc.value))
			if tc.valid && err != nil {
				t.Fatalf("expected valid value, got %v", err)
			}
			if !tc.valid && !errors.Is(err, ErrInvalid) {
				t.Fatalf("expected ErrInvalid, got %v", err)
			}
		})
	}
}

func TestCatalogGovernanceEnumerationsAreFailClosed(t *testing.T) {
	t.Parallel()
	if validAttributeDataTypes["object"] {
		t.Fatal("arbitrary object attributes must not be accepted")
	}
	if validRelationshipTypes["replacement_without_review"] {
		t.Fatal("unknown relationship type must not be accepted")
	}
	for _, value := range []string{"substitute", "alternative", "complement"} {
		if !validRelationshipTypes[value] {
			t.Fatalf("expected governed relationship type %q", value)
		}
	}
}

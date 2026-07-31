package workforce

import (
	"errors"
	"reflect"
	"testing"
)

func TestCleanScopeValuesTrimsAndDeduplicates(t *testing.T) {
	got := cleanScopeValues([]string{" operations ", "", "operations", "partners"})
	want := []string{"operations", "partners"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected cleaned scopes: got=%v want=%v", got, want)
	}
}

func TestDecodeStringArrayKeepsIndependentEmptyArrays(t *testing.T) {
	var first, second, third []string
	for _, target := range []*[]string{&first, &second, &third} {
		if err := decodeStringArray([]byte(`[]`), target); err != nil {
			t.Fatal(err)
		}
	}
	if first == nil || second == nil || third == nil {
		t.Fatalf("all decoded arrays must be non-nil: first=%v second=%v third=%v", first, second, third)
	}
}

func TestValidateEmployeeGovernanceRequiresReferencedActiveGuarantee(t *testing.T) {
	input := UpsertEmployeeGovernanceInput{
		PositionTitle:   "مدير العمليات",
		EmploymentClass: "department_manager",
		GuaranteeType:   "financial",
		GuaranteeStatus: "active",
	}
	if err := validateEmployeeGovernanceInput(&input); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input without guarantee reference, got %v", err)
	}
	input.GuaranteeReference = "guarantee-ref-1"
	if err := validateEmployeeGovernanceInput(&input); err != nil {
		t.Fatalf("expected valid governed employee input, got %v", err)
	}
}

package workforce

import (
	"encoding/json"
	"os"
	"regexp"
	"strings"
	"testing"
)

func TestCreateFieldAgentInputOwnsIdentityInputs(t *testing.T) {
	input := CreateFieldAgentInput{
		FullNameAr:     "ميداني اختبار",
		Username:       "field.test",
		PhoneE164:      "+967777777777",
		ServiceZoneID:  "zone-east",
		EngagementType: "independent_contractor",
	}

	encoded, err := json.Marshal(input)
	if err != nil {
		t.Fatalf("marshal field create input: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(encoded, &payload); err != nil {
		t.Fatalf("decode field create payload: %v", err)
	}
	if _, ok := payload["actorId"]; ok {
		t.Fatal("public field create payload must not accept or emit actorId")
	}
	if _, ok := payload["shiftCode"]; ok {
		t.Fatal("field providers must not expose shiftCode")
	}
	if payload["username"] != input.Username || payload["phoneE164"] != input.PhoneE164 {
		t.Fatalf("identity inputs missing from payload: %#v", payload)
	}

}

// TestReplayExitsAreKindProfileGuarded (root #10): every replay success exit
// in the three create flows must first verify the actor still holds THIS
// flow's kind profile. A foreign-kind actor replaying a creation must get
// ErrWorkforceKindConflict, never the foreign profile dressed as a replay
// hit. This source contract is enforced structurally so a future edit cannot
// silently reintroduce an unguarded replay exit.
func TestReplayExitsAreKindProfileGuarded(t *testing.T) {
	source, err := os.ReadFile("service.go")
	if err != nil {
		t.Fatalf("read service.go: %v", err)
	}
	text := string(source)
	unguarded := regexp.MustCompile(
		`PersonByActorID\(ctx, actorID\); lookupErr == nil \{\n(\s*)return existing, true, nil\n(\s*)\}`)
	if loc := unguarded.FindStringIndex(text); loc != nil {
		t.Fatalf("unguarded replay exit at byte offset %d: every replay success must be preceded by a kind-profile check", loc[0])
	}
	for _, profile := range []string{"FieldProfile", "CaptainProfile", "EmployeeProfile"} {
		need := "existing." + profile + " == nil {"
		if !strings.Contains(text, need) {
			t.Fatalf("service.go lost its %s replay guard", profile)
		}
	}
}

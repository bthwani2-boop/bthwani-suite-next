package workforce

import (
	"encoding/json"
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

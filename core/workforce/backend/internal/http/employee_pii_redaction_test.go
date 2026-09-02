package http

import (
	auth "github.com/bthwani2-boop/bthwani-identityauth"
	"testing"
	"workforce-api/internal/workforce"
)

func TestEmployeePIIRedaction(t *testing.T) {
	tests := []struct {
		name           string
		identity       auth.Identity
		person         workforce.Person
		expectRedacted bool
	}{
		{
			name: "HR with permission can see PII",
			identity: auth.Identity{
				Subject: "hr-1",
				Permissions: []auth.Permission{
					{Service: "workforce", Action: "pii:read", Scope: "all"},
				},
			},
			person: workforce.Person{
				ActorID: "actor-1",
				FieldProfile: &workforce.FieldProfile{
					EmergencyContactName: "John Doe",
				},
			},
			expectRedacted: false,
		},
		{
			name: "Self can see own PII",
			identity: auth.Identity{
				Subject: "actor-1",
			},
			person: workforce.Person{
				ActorID: "actor-1",
				FieldProfile: &workforce.FieldProfile{
					EmergencyContactName: "John Doe",
				},
			},
			expectRedacted: false,
		},
		{
			name: "Manager without PII permission cannot see PII",
			identity: auth.Identity{
				Subject: "manager-1",
				Permissions: []auth.Permission{
					{Service: "workforce", Action: "employee:read", Scope: "department:sales"},
				},
			},
			person: workforce.Person{
				ActorID: "actor-1",
				FieldProfile: &workforce.FieldProfile{
					EmergencyContactName:  "John Doe",
					EmergencyContactPhone: "123456789",
				},
			},
			expectRedacted: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			redactPersonPII(tt.identity, &tt.person)

			if tt.expectRedacted {
				if tt.person.FieldProfile != nil && tt.person.FieldProfile.EmergencyContactName != "" {
					t.Errorf("expected PII to be redacted, got %s", tt.person.FieldProfile.EmergencyContactName)
				}
			} else {
				if tt.person.FieldProfile != nil && tt.person.FieldProfile.EmergencyContactName == "" {
					t.Errorf("expected PII to remain visible, but it was redacted")
				}
			}
		})
	}
}

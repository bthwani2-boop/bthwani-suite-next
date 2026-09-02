package workforce

import (
	"testing"
	"time"
)

// TestEmployeeActivationReadinessIsCaptainGateFree pins the root #7 closure:
// the readiness policy for employees is the sovereign employee minimum alone.
// The old else-branch forced BOTH captains and employees through the DSH
// captain financial-dispatch eligibility gate, which employees can never
// satisfy — an unsatisfiable issuance gate diverging from the readback that
// reported them ready.
func TestEmployeeActivationReadinessIsCaptainGateFree(t *testing.T) {
	cases := []struct {
		name   string
		person Person
		ready  bool
	}{
		{"employee with department and role is sovereign-ready", Person{
			FullNameAr: "موظف العمليات", WorkforceCode: "EMP-1",
			EmployeeProfile: &EmployeeProfile{Department: "operations", Role: "analyst"},
		}, true},
		{"employee missing department is not ready", Person{
			FullNameAr: "موظف العمليات", WorkforceCode: "EMP-2",
			EmployeeProfile: &EmployeeProfile{Role: "analyst"},
		}, false},
		{"employee missing role is not ready", Person{
			FullNameAr: "موظف العمليات", WorkforceCode: "EMP-3",
			EmployeeProfile: &EmployeeProfile{Department: "operations"},
		}, false},
		{"employee without any profile is not ready", Person{
			FullNameAr: "موظف العمليات", WorkforceCode: "EMP-4",
		}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := sovereignFieldsComplete(tc.person); got != tc.ready {
				t.Fatalf("sovereignFieldsComplete = %v, want %v", got, tc.ready)
			}
		})
	}
}

// TestCaptainReadinessStillRequiresItsOwnGates pins that the captain gates were
// not weakened by the employee fix: vehicle, license validity/expiry, city.
func TestCaptainReadinessStillRequiresItsOwnGates(t *testing.T) {
	valid := Person{
		FullNameAr: "كابتن", WorkforceCode: "CAP-1",
		CaptainProfile: &CaptainProfile{
			VehicleType: "motorcycle", VehicleIdentifier: "1234",
			LicenseStatus: "valid", LicenseExpiresAt: time.Now().AddDate(1, 0, 0).Format("2006-01-02"),
			OperatingServiceAreaCode: "ADE",
		},
	}
	if !sovereignFieldsComplete(valid) {
		t.Fatal("complete captain profile must be sovereign-ready")
	}
	expired := valid
	expired.CaptainProfile = &CaptainProfile{
		VehicleType: "motorcycle", VehicleIdentifier: "1234",
		LicenseStatus: "valid", LicenseExpiresAt: time.Now().AddDate(-1, 0, 0).Format("2006-01-02"),
		OperatingServiceAreaCode: "ADE",
	}
	if sovereignFieldsComplete(expired) {
		t.Fatal("expired captain license must never be ready")
	}
}

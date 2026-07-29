package workforce

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"workforce-api/internal/identityclient"
)

func newBundleRegistryTestService(t *testing.T) (*Service, func()) {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/employees/permission-bundles" {
			http.NotFound(w, r)
			return
		}
		if r.Header.Get("X-Operator-Context-ID") != "tenant-test" {
			t.Fatalf("missing trusted tenant header: %q", r.Header.Get("X-Operator-Context-ID"))
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"permissionBundles": []map[string]any{
				{
					"code": "platform_owner",
					"nameAr": "مالك المنصة ومدير المشروع",
					"nameEn": "Platform owner and project manager",
					"allowedEmploymentClasses": []string{"project_manager"},
					"defaultDepartmentScope": "platform",
					"departmentSelectionAllowed": false,
				},
				{
					"code": "operations_manager",
					"nameAr": "مدير العمليات",
					"nameEn": "Operations manager",
					"allowedEmploymentClasses": []string{"department_manager"},
					"defaultDepartmentScope": "operations",
					"departmentSelectionAllowed": false,
				},
			},
		})
	}))
	service := &Service{identity: identityclient.NewClient(server.URL, "test-token", "tenant-test")}
	return service, server.Close
}

func TestLeadershipBundleResolutionUsesIdentityRegistry(t *testing.T) {
	service, closeServer := newBundleRegistryTestService(t)
	defer closeServer()

	bundle, err := service.resolveLeadershipBundle(context.Background(), "operations_manager", "department_manager", "operations")
	if err != nil {
		t.Fatalf("resolveLeadershipBundle: %v", err)
	}
	if bundle.Code != "operations_manager" || bundle.DepartmentSelectionAllowed || bundle.DefaultDepartmentScope != "operations" {
		t.Fatalf("unexpected bundle: %+v", bundle)
	}

	if _, err := service.resolveLeadershipBundle(context.Background(), "operations_manager", "project_manager", "operations"); err == nil {
		t.Fatal("expected Identity registry employment-class mismatch to be rejected")
	}
	if _, err := service.resolveLeadershipBundle(context.Background(), "operations_manager", "department_manager", "finance"); err == nil {
		t.Fatal("expected Identity-owned manager department mismatch to be rejected")
	}
	if _, err := service.resolveLeadershipBundle(context.Background(), "platform_owner", "project_manager", "operations"); err == nil {
		t.Fatal("expected fixed Identity department scope mismatch to be rejected")
	}
}

func TestNormalizeSovereignDepartment(t *testing.T) {
	got, err := normalizeSovereignDepartment("Operations Team")
	if err != nil {
		t.Fatalf("normalizeSovereignDepartment: %v", err)
	}
	if got != "operations-team" {
		t.Fatalf("got %q want operations-team", got)
	}
	if _, err := normalizeSovereignDepartment("../ops"); err == nil {
		t.Fatal("expected traversal-like department to be rejected")
	}
}

func TestNormalizeSovereignPermissionBundle(t *testing.T) {
	got, err := normalizeSovereignPermissionBundle("operations_manager")
	if err != nil || got != "operations_manager" {
		t.Fatalf("normalizeSovereignPermissionBundle=%q,%v", got, err)
	}
	if _, err := normalizeSovereignPermissionBundle("../owner"); err == nil {
		t.Fatal("expected traversal-like permission bundle to be rejected")
	}
}

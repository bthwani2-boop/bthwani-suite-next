package identityclient

import (
	"context"
	"net/http"
)

// EmployeeProvisionInput requests one server-owned administrative permission
// bundle. Arbitrary permissions and operator scope are never accepted from
// Workforce payloads or browsers; the client sends its configured trusted
// operator context only as an internal header.
type EmployeeProvisionInput struct {
	Username         string `json:"username"`
	PhoneE164        string `json:"phoneE164"`
	PermissionBundle string `json:"permissionBundle"`
	DepartmentScope  string `json:"departmentScope"`
}

// EmployeePermissionBundleDescriptor is supplied by Identity. Workforce may
// use it to validate organisational assignments and render reference choices,
// but must not expand the bundle into effective permissions.
type EmployeePermissionBundleDescriptor struct {
	Code                       string   `json:"code"`
	NameAr                     string   `json:"nameAr"`
	NameEn                     string   `json:"nameEn"`
	AllowedEmploymentClasses   []string `json:"allowedEmploymentClasses"`
	DefaultDepartmentScope     string   `json:"defaultDepartmentScope,omitempty"`
	DepartmentSelectionAllowed bool     `json:"departmentSelectionAllowed"`
}

func (c *Client) EmployeePermissionBundles(ctx context.Context) ([]EmployeePermissionBundleDescriptor, error) {
	var response struct {
		PermissionBundles []EmployeePermissionBundleDescriptor `json:"permissionBundles"`
	}
	if err := c.do(ctx, http.MethodGet, "/internal/employees/permission-bundles", nil, &response, nil); err != nil {
		return nil, err
	}
	if response.PermissionBundles == nil {
		response.PermissionBundles = []EmployeePermissionBundleDescriptor{}
	}
	return response.PermissionBundles, nil
}

func (c *Client) ProvisionEmployee(ctx context.Context, input EmployeeProvisionInput) (ActorView, error) {
	var view ActorView
	err := c.do(ctx, http.MethodPost, "/internal/employees/provision", input, &view, nil)
	return view, err
}

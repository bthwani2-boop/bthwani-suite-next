package identityclient

import (
	"context"
	"net/http"
)

// EmployeeProvisionInput requests one server-owned administrative permission
// bundle. Arbitrary permissions are never accepted from Workforce or browsers.
type EmployeeProvisionInput struct {
	Username         string `json:"username"`
	PhoneE164        string `json:"phoneE164"`
	PermissionBundle string `json:"permissionBundle"`
	DepartmentScope  string `json:"departmentScope"`
	TenantID         string `json:"tenantId,omitempty"`
}

func (c *Client) ProvisionEmployee(ctx context.Context, input EmployeeProvisionInput) (ActorView, error) {
	var view ActorView
	tenantID, err := c.trustedTenant(input.TenantID)
	if err != nil {
		return view, err
	}
	input.TenantID = tenantID
	err = c.do(ctx, http.MethodPost, "/internal/employees/provision", input, &view, nil)
	return view, err
}

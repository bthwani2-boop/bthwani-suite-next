package identity

import "strings"

// EmployeePermissionBundleDescriptor is the canonical, read-only description
// of one administrative access package. Identity owns bundle identifiers,
// applicability and permission expansion. Consumers may display these values
// but must not recreate or reinterpret them locally.
type EmployeePermissionBundleDescriptor struct {
	Code                       string   `json:"code"`
	NameAr                     string   `json:"nameAr"`
	NameEn                     string   `json:"nameEn"`
	AllowedEmploymentClasses   []string `json:"allowedEmploymentClasses"`
	DefaultDepartmentScope     string   `json:"defaultDepartmentScope,omitempty"`
	DepartmentSelectionAllowed bool     `json:"departmentSelectionAllowed"`
}

var employeePermissionBundleRegistry = []EmployeePermissionBundleDescriptor{
	{
		Code: EmployeeBundleStaff, NameAr: "موظف", NameEn: "Staff",
		AllowedEmploymentClasses: []string{"staff"}, DepartmentSelectionAllowed: true,
	},
	{
		Code: EmployeeBundlePlatformOwner, NameAr: "مالك المنصة ومدير المشروع", NameEn: "Platform owner and project manager",
		AllowedEmploymentClasses: []string{"project_manager"}, DefaultDepartmentScope: "platform",
	},
	{
		Code: EmployeeBundlePlatformCoordinator, NameAr: "منسق المنصة", NameEn: "Platform coordinator",
		AllowedEmploymentClasses: []string{"coordinator", "executive"}, DefaultDepartmentScope: "platform",
	},
	{
		Code: EmployeeBundleOperationsManager, NameAr: "مدير العمليات", NameEn: "Operations manager",
		AllowedEmploymentClasses: []string{"department_manager"}, DepartmentSelectionAllowed: true,
	},
	{
		Code: EmployeeBundlePartnersManager, NameAr: "مدير الشركاء", NameEn: "Partners manager",
		AllowedEmploymentClasses: []string{"department_manager"}, DepartmentSelectionAllowed: true,
	},
	{
		Code: EmployeeBundleFinanceManager, NameAr: "مدير المالية", NameEn: "Finance manager",
		AllowedEmploymentClasses: []string{"department_manager"}, DepartmentSelectionAllowed: true,
	},
	{
		Code: EmployeeBundleSupportManager, NameAr: "مدير الدعم", NameEn: "Support manager",
		AllowedEmploymentClasses: []string{"department_manager"}, DepartmentSelectionAllowed: true,
	},
	{
		Code: EmployeeBundleHRManager, NameAr: "مدير الموارد البشرية", NameEn: "HR manager",
		AllowedEmploymentClasses: []string{"department_manager"}, DepartmentSelectionAllowed: true,
	},
}

// EmployeePermissionBundles returns a defensive copy so no caller can mutate
// Identity's process-level canonical registry.
func EmployeePermissionBundles() []EmployeePermissionBundleDescriptor {
	result := make([]EmployeePermissionBundleDescriptor, 0, len(employeePermissionBundleRegistry))
	for _, item := range employeePermissionBundleRegistry {
		copyItem := item
		copyItem.AllowedEmploymentClasses = append([]string(nil), item.AllowedEmploymentClasses...)
		result = append(result, copyItem)
	}
	return result
}

func EmployeePermissionBundle(code string) (EmployeePermissionBundleDescriptor, bool) {
	code = strings.TrimSpace(code)
	for _, item := range employeePermissionBundleRegistry {
		if item.Code == code {
			copyItem := item
			copyItem.AllowedEmploymentClasses = append([]string(nil), item.AllowedEmploymentClasses...)
			return copyItem, true
		}
	}
	return EmployeePermissionBundleDescriptor{}, false
}

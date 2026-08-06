package identity

import "strings"

const (
	PartnerBundleOwner      = "owner"
	PartnerBundleManager    = "manager"
	PartnerBundleSupervisor = "supervisor"
	PartnerBundleStaff      = "staff"
	PartnerBundleCourier    = "courier"
)

type PartnerPermissionBundleDescriptor struct {
	Code    string   `json:"code"`
	NameAr  string   `json:"nameAr"`
	NameEn  string   `json:"nameEn"`
	Actions []string `json:"actions"`
}

var partnerPermissionBundleRegistry = []PartnerPermissionBundleDescriptor{
	{Code: PartnerBundleOwner, NameAr: "مالك", NameEn: "Owner", Actions: []string{"team.manage", "courier.manage", "coverage.read", "catalog.manage", "orders.manage"}},
	{Code: PartnerBundleManager, NameAr: "مدير", NameEn: "Manager", Actions: []string{"team.manage", "courier.manage", "coverage.read", "orders.manage"}},
	{Code: PartnerBundleSupervisor, NameAr: "مشرف", NameEn: "Supervisor", Actions: []string{"coverage.read", "orders.manage"}},
	{Code: PartnerBundleStaff, NameAr: "موظف", NameEn: "Staff", Actions: []string{"orders.manage"}},
	{Code: PartnerBundleCourier, NameAr: "كابتن", NameEn: "Courier", Actions: []string{"orders.manage"}},
}

// PartnerPermissionBundles returns a defensive copy.
func PartnerPermissionBundles() []PartnerPermissionBundleDescriptor {
	result := make([]PartnerPermissionBundleDescriptor, 0, len(partnerPermissionBundleRegistry))
	result = append(result, partnerPermissionBundleRegistry...)
	return result
}

// PartnerBundlePermissions translates a DSH store role into the official Identity permissions.
// The storeID ensures the permissions are scoped only to that store.
func PartnerBundlePermissions(bundle string, storeID string) []Permission {
	grant := func(actions ...string) []Permission {
		permissions := make([]Permission, 0, len(actions))
		for _, action := range actions {
			permissions = append(permissions, Permission{
				Service: "dsh", Surface: "app-partner", Action: action, Scope: "store:" + storeID,
			})
		}
		return permissions
	}

	switch strings.TrimSpace(bundle) {
	case PartnerBundleOwner:
		return grant("team.manage", "courier.manage", "coverage.read", "catalog.manage", "orders.manage")
	case PartnerBundleManager:
		return grant("team.manage", "courier.manage", "coverage.read", "orders.manage")
	case PartnerBundleSupervisor:
		return grant("coverage.read", "orders.manage")
	case PartnerBundleCourier:
		return grant("orders.manage")
	case PartnerBundleStaff:
		fallthrough
	default:
		return grant("orders.manage")
	}
}

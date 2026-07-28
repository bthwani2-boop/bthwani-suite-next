package workforce

import (
	"context"

	"workforce-api/internal/identityclient"
)

type WorkforceReferenceOption struct {
	Code   string `json:"code"`
	NameAr string `json:"nameAr"`
	NameEn string `json:"nameEn"`
}

type SovereignLeadershipReferenceData struct {
	EmploymentClasses []WorkforceReferenceOption                       `json:"employmentClasses"`
	Departments       []WorkforceReferenceOption                       `json:"departments"`
	OfficeLocations   []WorkforceReferenceOption                       `json:"officeLocations"`
	PermissionBundles []identityclient.EmployeePermissionBundleDescriptor `json:"permissionBundles"`
}

var sovereignLeadershipEmploymentClasses = []WorkforceReferenceOption{
	{Code: "project_manager", NameAr: "مدير المشروع", NameEn: "Project manager"},
	{Code: "coordinator", NameAr: "منسق المنصة", NameEn: "Platform coordinator"},
	{Code: "executive", NameAr: "إدارة تنفيذية", NameEn: "Executive leadership"},
	{Code: "department_manager", NameAr: "مدير قسم", NameEn: "Department manager"},
}

var sovereignLeadershipDepartments = []WorkforceReferenceOption{
	{Code: "dashboard", NameAr: "الرئيسية", NameEn: "Dashboard"},
	{Code: "operations", NameAr: "العمليات", NameEn: "Operations"},
	{Code: "analytics", NameAr: "التحليلات", NameEn: "Analytics"},
	{Code: "partners", NameAr: "الشركاء والمتاجر", NameEn: "Partners and stores"},
	{Code: "catalogs", NameAr: "اعتماد الكتالوجات", NameEn: "Catalog approvals"},
	{Code: "marketing", NameAr: "التسويق والاكتشاف", NameEn: "Marketing and discovery"},
	{Code: "finance", NameAr: "المالية والتسويات", NameEn: "Finance and settlements"},
	{Code: "support", NameAr: "الدعم والمساعدة", NameEn: "Support"},
	{Code: "platform", NameAr: "المنصة السيادية", NameEn: "Sovereign platform"},
	{Code: "administration", NameAr: "الإدارة والصلاحيات", NameEn: "Administration"},
	{Code: "hr", NameAr: "الموارد البشرية", NameEn: "Human resources"},
}

var sovereignLeadershipOfficeLocations = []WorkforceReferenceOption{
	{Code: "headquarters", NameAr: "المقر الرئيسي", NameEn: "Headquarters"},
	{Code: "sanaa", NameAr: "صنعاء", NameEn: "Sana'a"},
	{Code: "aden", NameAr: "عدن", NameEn: "Aden"},
	{Code: "taiz", NameAr: "تعز", NameEn: "Taiz"},
	{Code: "hodeidah", NameAr: "الحديدة", NameEn: "Al Hodeidah"},
	{Code: "hadramout", NameAr: "حضرموت", NameEn: "Hadramout"},
	{Code: "other", NameAr: "أخرى", NameEn: "Other"},
}

func copyReferenceOptions(values []WorkforceReferenceOption) []WorkforceReferenceOption {
	return append([]WorkforceReferenceOption(nil), values...)
}

// SovereignLeadershipReferences aggregates Workforce-owned organisational
// reference data with Identity-owned permission bundles. No browser maintains
// a mutable local copy of either source.
func (s *Service) SovereignLeadershipReferences(ctx context.Context) (SovereignLeadershipReferenceData, error) {
	bundles, err := s.identity.EmployeePermissionBundles(ctx)
	if err != nil {
		return SovereignLeadershipReferenceData{}, err
	}
	return SovereignLeadershipReferenceData{
		EmploymentClasses: copyReferenceOptions(sovereignLeadershipEmploymentClasses),
		Departments:       copyReferenceOptions(sovereignLeadershipDepartments),
		OfficeLocations:   copyReferenceOptions(sovereignLeadershipOfficeLocations),
		PermissionBundles: bundles,
	}, nil
}

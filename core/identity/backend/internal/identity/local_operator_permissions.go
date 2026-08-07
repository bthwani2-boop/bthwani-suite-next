package identity

// localOperatorDevelopmentPermissions is the single local-development authority
// for the control-panel operator. Every entry must map to an action consumed by
// a live service boundary; aliases and migration-era permission names do not
// belong here.
func localOperatorDevelopmentPermissions() []Permission {
	return []Permission{
		{Service: "dsh", Surface: "control-panel", Action: "store:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "store:write", Scope: "all"},

		{Service: "dsh", Surface: "control-panel", Action: "partners.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "partners.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "partners.activate", Scope: "all"},

		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.categories.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.categories.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.products.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.products.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.banners.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.banners.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.discounts.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.discounts.manage", Scope: "all"},

		{Service: "workforce", Surface: "control-panel", Action: "provider:read", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:create", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:update", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:suspend", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:reactivate", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider.activation:issue", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "reference:manage", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "audit:read", Scope: "all"},

		{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:variables:propose", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:flags:manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:services:manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:health:acknowledge", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:audit:export", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:wlt-policy:read", Scope: "all"},

		{Service: "providers", Surface: "control-panel", Action: "provider:read", Scope: "all"},
		{Service: "providers", Surface: "control-panel", Action: "provider:update", Scope: "all"},
		{Service: "providers", Surface: "control-panel", Action: "provider:test", Scope: "all"},
	}
}

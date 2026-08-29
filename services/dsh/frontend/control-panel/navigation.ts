import { CONTROL_PANEL_SECTION_ROUTES } from "../shared/control-panel-routes";
import {
  hasAnyControlPanelPermissionAlternative,
  type ControlPanelPermissionAlternatives,
  type ControlPanelPermissionIdentity,
} from "../shared/session/control-panel-permissions";

type DshNavItem = {
  readonly section: string;
  readonly label: string;
  readonly route: string;
  readonly readRequirements: ControlPanelPermissionAlternatives;
};

/** Ordered public navigation contract for the DSH control-panel surface. */
export const DSH_NAV_ITEMS = [
  {
    section: "dashboard",
    label: "الرئيسية",
    route: CONTROL_PANEL_SECTION_ROUTES.dashboard,
    readRequirements: [[{ service: "dsh", action: "analytics.read" }]],
  },
  {
    section: "operations",
    label: "العمليات",
    route: CONTROL_PANEL_SECTION_ROUTES.operations,
    readRequirements: [
      [{ service: "dsh", action: "operations.read" }],
      [{ service: "dsh", action: "operations.special_requests.read" }],
      [
        { service: "dsh", action: "analytics.read" },
        { service: "dsh", action: "platform:read" },
      ],
      [{ service: "dsh", action: "dsh.service_zones.read" }],
      [{ service: "dsh", action: "dsh.fulfillment_sla.read" }],
      [{ service: "dsh", action: "dsh.dispatch_capacity.read" }],
    ],
  },
  {
    section: "analytics",
    label: "التحليلات",
    route: CONTROL_PANEL_SECTION_ROUTES.analytics,
    readRequirements: [[{ service: "dsh", action: "analytics.read" }]],
  },
  {
    section: "partners",
    label: "الشركاء والمتاجر",
    route: CONTROL_PANEL_SECTION_ROUTES.partners,
    readRequirements: [[{ service: "dsh", action: "partners.read" }]],
  },
  {
    section: "catalogs",
    label: "اعتماد الكتالوجات",
    route: CONTROL_PANEL_SECTION_ROUTES.catalogs,
    readRequirements: [
      [{ service: "dsh", action: "catalog.product.read" }],
      [{ service: "dsh", action: "catalog.proposal.read" }],
      [{ service: "dsh", action: "catalog.media.read" }],
      [{ service: "dsh", action: "catalog.policy.read" }],
      [{ service: "dsh", action: "catalog.assortment.read" }],
      [{ service: "dsh", action: "catalog.seed.read" }],
      [{ service: "dsh", action: "catalog.audit.read" }],
    ],
  },
  {
    section: "marketing",
    label: "التسويق والاكتشاف",
    route: CONTROL_PANEL_SECTION_ROUTES.marketing,
    readRequirements: [[{ service: "dsh", action: "marketing.read" }]],
  },
  {
    section: "finance",
    label: "المالية والتسويات",
    route: CONTROL_PANEL_SECTION_ROUTES.finance,
    readRequirements: [[{ service: "dsh", action: "finance.read" }]],
  },
  {
    section: "support",
    label: "الدعم والمساعدة",
    route: CONTROL_PANEL_SECTION_ROUTES.support,
    readRequirements: [[{ service: "dsh", action: "support.read" }]],
  },
  {
    section: "platform",
    label: "المنصة السيادية",
    route: CONTROL_PANEL_SECTION_ROUTES.platform,
    readRequirements: [[{ service: "dsh", action: "platform:read" }]],
  },
  {
    section: "administration",
    label: "الإدارة والصلاحيات",
    route: CONTROL_PANEL_SECTION_ROUTES.administration,
    readRequirements: [
      [{ service: "dsh", action: "administration.role.read" }],
      [{ service: "dsh", action: "administration.staff.read" }],
      [{ service: "dsh", action: "administration.audit.read" }],
      [{ service: "dsh", action: "administration.diagnostics.read" }],
    ],
  },
  {
    section: "hr",
    label: "الموارد البشرية",
    route: CONTROL_PANEL_SECTION_ROUTES.hr,
    readRequirements: [[{ service: "workforce", action: "provider:read" }]],
  },
] as const satisfies readonly DshNavItem[];

export type DshSection = (typeof DSH_NAV_ITEMS)[number]["section"];

export function canReadDshNavItem(
  identity: ControlPanelPermissionIdentity | null | undefined,
  item: (typeof DSH_NAV_ITEMS)[number],
): boolean {
  return hasAnyControlPanelPermissionAlternative(identity, item.readRequirements);
}

export function resolveDshNavigationItem(pathname: string | null): (typeof DSH_NAV_ITEMS)[number] | undefined {
  if (!pathname) return undefined;
  return [...DSH_NAV_ITEMS]
    .sort((a, b) => b.route.length - a.route.length)
    .find((item) => pathname.startsWith(item.route));
}

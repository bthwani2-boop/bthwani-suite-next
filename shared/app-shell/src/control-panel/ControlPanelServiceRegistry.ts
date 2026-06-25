import type { ControlPanelSection } from "./ControlPanelSectionRegistry";

export type ControlPanelServiceOwnerBoundary = "dsh" | "wlt" | "reserved";

export type ControlPanelServiceRegistration = {
  readonly id: string;
  readonly label: string;
  readonly allowedSections: ReadonlyArray<ControlPanelSection>;
  readonly enabled: boolean;
  readonly ownerBoundary: ControlPanelServiceOwnerBoundary;
};

export const CONTROL_PANEL_SERVICE_REGISTRY: ReadonlyArray<ControlPanelServiceRegistration> = [
  {
    id: "dsh",
    label: "DSH — خدمة الاكتشاف",
    allowedSections: ["dashboard", "operations", "catalogs", "partners", "support"],
    enabled: true,
    ownerBoundary: "dsh",
  },
  {
    id: "wlt",
    label: "WLT — المحفظة المالية",
    allowedSections: ["finance"],
    enabled: false,
    ownerBoundary: "wlt",
  },
] as const;

export function getServiceRegistration(
  id: string,
): ControlPanelServiceRegistration | undefined {
  return CONTROL_PANEL_SERVICE_REGISTRY.find((s) => s.id === id);
}

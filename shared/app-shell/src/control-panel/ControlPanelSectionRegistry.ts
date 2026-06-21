export const CONTROL_PANEL_SECTIONS = [
  "dashboard",
  "operations",
  "finance",
  "catalogs",
  "partners",
  "marketing",
  "support",
  "platform",
  "administration",
  "hr",
] as const;

export type ControlPanelSection = (typeof CONTROL_PANEL_SECTIONS)[number];

export type ControlPanelSectionMeta = {
  readonly id: ControlPanelSection;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly order: number;
};

export const CONTROL_PANEL_SECTION_REGISTRY: ReadonlyArray<ControlPanelSectionMeta> = [
  { id: "dashboard",      labelAr: "لوحة البيانات",    labelEn: "Dashboard",       order: 1  },
  { id: "operations",     labelAr: "العمليات",         labelEn: "Operations",      order: 2  },
  { id: "finance",        labelAr: "المالية",          labelEn: "Finance",         order: 3  },
  { id: "catalogs",       labelAr: "الكتالوجات",       labelEn: "Catalogs",        order: 4  },
  { id: "partners",       labelAr: "الشركاء",          labelEn: "Partners",        order: 5  },
  { id: "marketing",      labelAr: "التسويق",          labelEn: "Marketing",       order: 6  },
  { id: "support",        labelAr: "الدعم",            labelEn: "Support",         order: 7  },
  { id: "platform",       labelAr: "المنصة",           labelEn: "Platform",        order: 8  },
  { id: "administration", labelAr: "الإدارة",          labelEn: "Administration",  order: 9  },
  { id: "hr",             labelAr: "الموارد البشرية",  labelEn: "HR",              order: 10 },
] as const;

export function isControlPanelSection(value: string): value is ControlPanelSection {
  return (CONTROL_PANEL_SECTIONS as readonly string[]).includes(value);
}

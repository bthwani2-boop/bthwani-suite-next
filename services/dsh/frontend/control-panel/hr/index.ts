export { default } from "./ControlPanelHrScreen";
export type * from "./hr.types";
export const HR_WORKSPACE_REGISTRY = [
  { id: "overview", label: "نظرة عامة" },
  { id: "staff", label: "فريق التشغيل" },
  { id: "readiness", label: "الحضور والجاهزية" },
  { id: "roles", label: "الأدوار" },
] as const;
export type HrWorkspaceId = (typeof HR_WORKSPACE_REGISTRY)[number]["id"];
type HrWorkspaceMeta = { readonly id: HrWorkspaceId; readonly label: string };

import { CpKpiCard } from "@bthwani/app-shell";
import type { DshStoreAdminKpiSummary } from "../../../shared/store";

type Props = { readonly kpi: DshStoreAdminKpiSummary };

export function StoreAdminKpiStrip({ kpi }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1.5rem",
        padding: "0.75rem 0",
        flexWrap: "wrap",
      }}
      role="region"
      aria-label="مؤشرات المتاجر"
    >
      <CpKpiCard label="إجمالي المتاجر" value={kpi.total} />
      <CpKpiCard label="متاجر مرئية" value={kpi.visible} />
      <CpKpiCard label="متاجر مفتوحة" value={kpi.open} />
      <CpKpiCard label="التصنيفات" value={kpi.categoryCount} />
    </div>
  );
}

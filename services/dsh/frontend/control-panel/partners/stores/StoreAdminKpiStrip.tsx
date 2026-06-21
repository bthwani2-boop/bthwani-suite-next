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
      <KpiCard label="إجمالي المتاجر" value={kpi.total} />
      <KpiCard label="متاجر مرئية" value={kpi.visible} />
      <KpiCard label="متاجر مفتوحة" value={kpi.open} />
      <KpiCard label="التصنيفات" value={kpi.categoryCount} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        minWidth: "7rem",
        padding: "0.5rem 0.75rem",
        border: "1px solid rgba(0, 0, 0, 0.12)",
        borderRadius: "0.375rem",
        background: "transparent",
      }}
    >
      <span style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>{label}</span>
    </div>
  );
}

import { CpKpiCard, CpKpiStrip } from "@bthwani/ui-kit/web";
import type { DshStoreAdminKpiSummary } from "../../../shared/store";

type Props = { readonly kpi: DshStoreAdminKpiSummary };

export function StoreAdminKpiStrip({ kpi }: Props) {
  return (
    <CpKpiStrip>
      <CpKpiCard label="إجمالي المتاجر" value={kpi.total} />
      <CpKpiCard label="متاجر مرئية" value={kpi.visible} />
      <CpKpiCard label="متاجر مفتوحة" value={kpi.open} />
      <CpKpiCard label="التصنيفات" value={kpi.categoryCount} />
    </CpKpiStrip>
  );
}

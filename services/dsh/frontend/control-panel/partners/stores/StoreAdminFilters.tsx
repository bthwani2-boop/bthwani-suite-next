import { CpFilterBar, CpSelect, CpSearchInput } from "@bthwani/ui-kit/web";
import type { DshStoreAdminFilters } from "../../../shared/store";

type Props = {
  readonly filters: DshStoreAdminFilters;
  readonly onChange: (next: DshStoreAdminFilters) => void;
};

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
  { value: "temporarily_closed", label: "مغلق مؤقتاً" },
  { value: "unavailable", label: "غير متاح" },
];

const VISIBILITY_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "true", label: "مرئي" },
  { value: "false", label: "مخفي" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "كل التصنيفات" },
  { value: "restaurant", label: "مطعم" },
  { value: "grocery", label: "بقالة" },
  { value: "pharmacy", label: "صيدلية" },
  { value: "bakery", label: "مخبز" },
  { value: "default", label: "عام" },
];

export function StoreAdminFilters({ filters, onChange }: Props) {
  return (
    <CpFilterBar label="فلاتر المتاجر">
      <CpSelect
        aria-label="الحالة"
        value={filters.status ?? ""}
        onChange={(v) => onChange({ ...filters, status: v || null })}
        options={STATUS_OPTIONS}
      />

      <CpSelect
        aria-label="الرؤية"
        value={
          filters.isVisible === null ? "" : String(filters.isVisible)
        }
        onChange={(v) =>
          onChange({
            ...filters,
            isVisible: v === "" ? null : v === "true",
          })
        }
        options={VISIBILITY_OPTIONS}
      />

      <CpSelect
        aria-label="التصنيف"
        value={filters.category ?? ""}
        onChange={(v) => onChange({ ...filters, category: v || null })}
        options={CATEGORY_OPTIONS}
      />

      <CpSearchInput
        aria-label="بحث"
        placeholder="بحث بالاسم أو الرمز..."
        value={filters.search ?? ""}
        onChange={(v) => onChange({ ...filters, search: v || null })}
        wide
      />
    </CpFilterBar>
  );
}

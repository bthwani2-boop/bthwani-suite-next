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
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        alignItems: "center",
      }}
      role="search"
      aria-label="فلاتر المتاجر"
    >
      <select
        aria-label="الحالة"
        value={filters.status ?? ""}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value || null })
        }
        style={selectStyle}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        aria-label="الرؤية"
        value={
          filters.isVisible === null
            ? ""
            : String(filters.isVisible)
        }
        onChange={(e) => {
          const val = e.target.value;
          onChange({
            ...filters,
            isVisible: val === "" ? null : val === "true",
          });
        }}
        style={selectStyle}
      >
        {VISIBILITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        aria-label="التصنيف"
        value={filters.category ?? ""}
        onChange={(e) =>
          onChange({ ...filters, category: e.target.value || null })
        }
        style={selectStyle}
      >
        {CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <input
        type="search"
        aria-label="بحث"
        placeholder="بحث بالاسم أو الرمز..."
        value={filters.search ?? ""}
        onChange={(e) =>
          onChange({ ...filters, search: e.target.value || null })
        }
        style={{
          ...selectStyle,
          minWidth: "14rem",
        }}
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "0.375rem 0.5rem",
  border: "1px solid rgba(0, 0, 0, 0.2)",
  borderRadius: "0.25rem",
  background: "transparent",
  fontSize: "0.875rem",
  cursor: "pointer",
};

import type { DshStoreAdminTableRow } from "../../../shared/store";

type Props = {
  readonly rows: readonly DshStoreAdminTableRow[];
  readonly selectedStoreId: string | null;
  readonly onSelectStore: (id: string | null) => void;
};

export function StoreAdminTable({ rows, selectedStoreId, onSelectStore }: Props) {
  if (rows.length === 0) {
    return (
      <div
        style={{ padding: "1.5rem 1rem", fontSize: "0.875rem", opacity: 0.65 }}
      >
        لا توجد نتائج تطابق الفلاتر الحالية.
      </div>
    );
  }

  return (
    <table
      style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
      aria-label="جدول المتاجر"
    >
      <thead>
        <tr>
          {HEADERS.map((h) => (
            <th key={h.key} style={thStyle} scope="col">
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            onClick={() =>
              onSelectStore(row.id === selectedStoreId ? null : row.id)
            }
            aria-selected={row.id === selectedStoreId}
            style={{
              cursor: "pointer",
              outline: row.id === selectedStoreId
                ? "2px solid currentColor"
                : undefined,
            }}
          >
            <td style={tdStyle}>
              <code style={{ fontSize: "0.75rem" }}>
                {row.id.slice(0, 8)}…
              </code>
            </td>
            <td style={tdStyle}>{row.displayName}</td>
            <td style={tdStyle}>{row.categoryLabel}</td>
            <td style={tdStyle}>
              <StatusBadge status={row.status} isVisible={row.isVisible} />
            </td>
            <td style={tdStyle}>
              {row.cityCode} / {row.serviceAreaCode}
            </td>
            <td style={tdStyle}>
              {row.deliveryModes.join("، ")}
            </td>
            <td style={tdStyle}>
              {row.hasProBadge ? "✓ Pro" : ""}
              {row.hasCouponBadge ? " ✓ كوبون" : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const HEADERS = [
  { key: "id", label: "المعرّف" },
  { key: "displayName", label: "الاسم" },
  { key: "category", label: "التصنيف" },
  { key: "status", label: "الحالة" },
  { key: "location", label: "الموقع" },
  { key: "modes", label: "طرق التوصيل" },
  { key: "badges", label: "شارات" },
];

function StatusBadge({
  status,
  isVisible,
}: {
  status: DshStoreAdminTableRow["status"];
  isVisible: boolean;
}) {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span>
      {label}
      {!isVisible && (
        <span style={{ marginInlineStart: "0.375rem", opacity: 0.55 }}>
          (مخفي)
        </span>
      )}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  inactive: "غير نشط",
  temporarily_closed: "مغلق مؤقتاً",
  unavailable: "غير متاح",
};

const thStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  textAlign: "start",
  fontWeight: 600,
  borderBottom: "2px solid rgba(0, 0, 0, 0.15)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
  verticalAlign: "middle",
};

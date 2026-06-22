import { CpTable, CpTableHeaderCell, CpTableCell } from "@bthwani/app-shell";
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
    <CpTable
      style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
      aria-label="جدول المتاجر"
    >
      <thead>
        <tr>
          {HEADERS.map((h) => (
            <CpTableHeaderCell key={h.key}>
              {h.label}
            </CpTableHeaderCell>
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
            aria-selected={row.id === selectedStoreId || undefined}
            style={{
              cursor: "pointer",
              outline: row.id === selectedStoreId
                ? "2px solid currentColor"
                : undefined,
            }}
          >
            <CpTableCell>
              <code style={{ fontSize: "0.75rem" }}>
                {row.id.slice(0, 8)}…
              </code>
            </CpTableCell>
            <CpTableCell>{row.displayName}</CpTableCell>
            <CpTableCell>{row.categoryLabel}</CpTableCell>
            <CpTableCell>
              <StatusBadge status={row.status} isVisible={row.isVisible} />
            </CpTableCell>
            <CpTableCell>
              {row.cityCode} / {row.serviceAreaCode}
            </CpTableCell>
            <CpTableCell>
              {row.deliveryModes.join("، ")}
            </CpTableCell>
            <CpTableCell>
              {row.hasProBadge ? "✓ Pro" : ""}
              {row.hasCouponBadge ? " ✓ كوبون" : ""}
            </CpTableCell>
          </tr>
        ))}
      </tbody>
    </CpTable>
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

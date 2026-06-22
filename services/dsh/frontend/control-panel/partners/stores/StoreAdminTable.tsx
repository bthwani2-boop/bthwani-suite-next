import {
  CpEmptyTableMessage,
  CpInlineCode,
  CpMutedInline,
  CpSelectableTableRow,
  CpTable,
  CpTableHeaderCell,
  CpTableCell,
} from "@bthwani/app-shell";
import type { DshStoreAdminTableRow } from "../../../shared/store";

type Props = {
  readonly rows: readonly DshStoreAdminTableRow[];
  readonly selectedStoreId: string | null;
  readonly onSelectStore: (id: string | null) => void;
};

export function StoreAdminTable({ rows, selectedStoreId, onSelectStore }: Props) {
  if (rows.length === 0) {
    return (
      <CpEmptyTableMessage>
        لا توجد نتائج تطابق الفلاتر الحالية.
      </CpEmptyTableMessage>
    );
  }

  return (
    <CpTable aria-label="جدول المتاجر">
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
          <CpSelectableTableRow
            key={row.id}
            onClick={() =>
              onSelectStore(row.id === selectedStoreId ? null : row.id)
            }
            selected={row.id === selectedStoreId}
          >
            <CpTableCell>
              <CpInlineCode>
                {row.id.slice(0, 8)}…
              </CpInlineCode>
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
          </CpSelectableTableRow>
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
        <CpMutedInline>
          (مخفي)
        </CpMutedInline>
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

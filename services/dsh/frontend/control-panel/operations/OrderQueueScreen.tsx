"use client";

import { CpPageHeader, DataTablePageFrame } from "@bthwani/ui-kit/web";
import { useIdentitySession } from "@bthwani/app-shell";
import { DataTable, Text } from "@bthwani/ui-kit";
import { useOperatorOrdersController } from "../../shared/orders";
import type { DshOrder, DshOrderStatus } from "../../shared/orders";
import { ORDER_STATUS_LABELS } from "../../shared/orders";

const STATUS_COLUMNS = [
  { key: "id", header: "معرف الطلب", render: (o: DshOrder) => <Text role="body">{o.id.slice(-8).toUpperCase()}</Text> },
  { key: "storeId", header: "معرف المتجر", render: (o: DshOrder) => <Text role="body">{o.storeId}</Text> },
  { key: "clientId", header: "معرف العميل", render: (o: DshOrder) => <Text role="body">{o.clientId.slice(-8)}</Text> },
  {
    key: "status",
    header: "الحالة",
    render: (o: DshOrder) => (
      <Text role="body">{ORDER_STATUS_LABELS[o.status as DshOrderStatus] ?? o.status}</Text>
    ),
  },
  {
    key: "rejectionReason",
    header: "سبب الرفض",
    render: (o: DshOrder) => (
      <Text role="body" tone="muted">{o.rejectionReason || "—"}</Text>
    ),
  },
  {
    key: "createdAt",
    header: "تاريخ الإنشاء",
    render: (o: DshOrder) => (
      <Text role="body">{new Date(o.createdAt).toLocaleString("ar-SA")}</Text>
    ),
  },
  {
    key: "updatedAt",
    header: "آخر تحديث",
    render: (o: DshOrder) => (
      <Text role="body">{new Date(o.updatedAt).toLocaleString("ar-SA")}</Text>
    ),
  },
] as const;

export function OrderQueueScreen() {
  const identity = useIdentitySession();
  const controller = useOperatorOrdersController();

  if (identity.state.kind !== "authenticated") {
    return (
      <Text role="body" dir="rtl">
        سجّل الدخول بحساب operator لمتابعة طابور الطلبات.
      </Text>
    );
  }

  const stateView =
    controller.state.kind === "loading" ? (
      <Text role="body">جاري تحميل الطلبات…</Text>
    ) : controller.state.kind === "empty" ? (
      <Text role="body">لا توجد طلبات حالياً.</Text>
    ) : controller.state.kind === "error" ? (
      <Text role="body">تعذر تحميل الطلبات: {controller.state.message}</Text>
    ) : undefined;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="طابور الطلبات" />}
      stateView={stateView}
    >
      {controller.state.kind === "success" && (
        <DataTable
          columns={STATUS_COLUMNS}
          rows={controller.state.orders as DshOrder[]}
          getRowKey={(o) => o.id}
          emptyTitle="لا توجد طلبات"
        />
      )}
    </DataTablePageFrame>
  );
}

export default OrderQueueScreen;

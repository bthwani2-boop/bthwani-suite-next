"use client";

import React from "react";
import { CpPageHeader, DataTablePageFrame } from "@bthwani/ui-kit/web";
import { useIdentitySession } from "@bthwani/app-shell";
import { Badge, Button, Card, DataTable, Text, TextField } from "@bthwani/ui-kit";
import {
  ASSIGNMENT_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  toDispatchCardViewModel,
  useOperatorDispatchController,
} from "../../shared/dispatch";
import type { DshDispatchAssignment } from "../../shared/dispatch";

const DISPATCH_COLUMNS = [
  {
    key: "orderId",
    header: "الطلب",
    render: (a: DshDispatchAssignment) => <Text role="body">{a.orderId.slice(-8).toUpperCase()}</Text>,
  },
  {
    key: "captainId",
    header: "الكابتن",
    render: (a: DshDispatchAssignment) => <Text role="body">{a.captainId}</Text>,
  },
  {
    key: "assignment",
    header: "المهمة",
    render: (a: DshDispatchAssignment) => <Text role="body">{ASSIGNMENT_STATUS_LABELS[a.status]}</Text>,
  },
  {
    key: "delivery",
    header: "التوصيل",
    render: (a: DshDispatchAssignment) => <Text role="body">{DELIVERY_STATUS_LABELS[a.delivery.status]}</Text>,
  },
  {
    key: "next",
    header: "الإجراء التالي",
    render: (a: DshDispatchAssignment) => <Text role="body">{toDispatchCardViewModel(a).nextActionLabel}</Text>,
  },
  {
    key: "updatedAt",
    header: "آخر تحديث",
    render: (a: DshDispatchAssignment) => <Text role="body">{new Date(a.updatedAt).toLocaleString("ar-SA")}</Text>,
  },
] as const;

export function DispatchAssignmentScreen() {
  const identity = useIdentitySession();
  const controller = useOperatorDispatchController();
  const [orderId, setOrderId] = React.useState("");
  const [captainId, setCaptainId] = React.useState("");

  if (identity.state.kind !== "authenticated") {
    return (
      <Text role="body" direction="rtl">
        سجّل الدخول بحساب operator لفتح غرفة الإرسال.
      </Text>
    );
  }

  const stateView =
    controller.state.kind === "loading" ? (
      <Text role="body">جاري تحميل غرفة الإرسال...</Text>
    ) : controller.state.kind === "empty" ? (
      <Text role="body">لا توجد مهام إرسال حالياً.</Text>
    ) : controller.state.kind === "error" ? (
      <Text role="body">تعذر تحميل غرفة الإرسال: {controller.state.message}</Text>
    ) : undefined;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="غرفة الإرسال" subtitle="تعيين الكابتن ومتابعة دورة التوصيل" />}
      stateView={stateView}
    >
      <Card>
        <Text role="titleMd">تعيين كابتن</Text>
        <TextField label="معرف الطلب" value={orderId} onChangeText={setOrderId} placeholder="order uuid" />
        <TextField label="معرف الكابتن" value={captainId} onChangeText={setCaptainId} placeholder="captain subject id" />
        <Button
          label="إنشاء مهمة"
          tone="primary"
          disabled={controller.actionState.kind === "submitting" || !orderId.trim() || !captainId.trim()}
          onPress={() => void controller.assign({ orderId: orderId.trim(), captainId: captainId.trim() })}
        />
        {controller.actionState.kind === "success" && <Badge label="تم إنشاء المهمة" tone="success" />}
        {controller.actionState.kind === "error" && <Text role="body" tone="danger">{controller.actionState.message}</Text>}
      </Card>

      {controller.state.kind === "success" && (
        <DataTable
          columns={DISPATCH_COLUMNS}
          rows={controller.state.assignments as DshDispatchAssignment[]}
          getRowKey={(a) => a.id}
          emptyTitle="لا توجد مهام إرسال"
        />
      )}
    </DataTablePageFrame>
  );
}

export default DispatchAssignmentScreen;

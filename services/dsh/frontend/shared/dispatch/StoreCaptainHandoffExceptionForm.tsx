import React from "react";
import {
  Box,
  Button,
  SearchField,
  StateView,
  Text,
} from "@bthwani/ui-kit";
import { STORE_CAPTAIN_HANDOFF_EXCEPTION_LABELS } from "../orders/orders.types";
import type { DshStoreCaptainHandoffExceptionReason } from "../orders/orders.types";
import type { StoreCaptainHandoffExceptionState } from "./use-store-captain-handoff-exception";

export function StoreCaptainHandoffExceptionForm({
  entityLabel,
  state,
  onReasonCodeChange,
  onNoteChange,
  onSubmit,
  onCancel,
}: {
  readonly entityLabel: string;
  readonly state: StoreCaptainHandoffExceptionState;
  readonly onReasonCodeChange: (reason: DshStoreCaptainHandoffExceptionReason) => void;
  readonly onNoteChange: (note: string) => void;
  readonly onSubmit: () => void | Promise<void>;
  readonly onCancel: () => void;
}) {
  if (state.kind === "idle" || state.kind === "success") return null;

  if (state.kind === "submitting") {
    return (
      <StateView
        title="جارٍ تسجيل استثناء العهدة"
        description={`سيُفتح البلاغ التشغيلي لـ ${entityLabel} دون تغيير حالة العهدة محليًا.`}
        loading
      />
    );
  }

  return (
    <Box gap={3} padding={3} background="surfaceInset">
      <Box gap={1}>
        <Text role="bodyStrong">إيقاف التسليم وفتح استثناء</Text>
        <Text role="bodySm" tone="muted">
          {`المرجع: ${entityLabel}. سيبقى التأكيد والاستلام محجوبين حتى تعالج العمليات البلاغ.`}
        </Text>
      </Box>

      <Box layoutDirection="row" gap={2}>
        {(["handoff_shortage", "handoff_mismatch"] as const).map((reason) => (
          <Button
            key={reason}
            label={STORE_CAPTAIN_HANDOFF_EXCEPTION_LABELS[reason]}
            tone={state.reasonCode === reason ? "primary" : "secondary"}
            size="sm"
            fullWidth={false}
            onPress={() => onReasonCodeChange(reason)}
          />
        ))}
      </Box>

      <SearchField
        value={state.note}
        onChangeText={onNoteChange}
        placeholder="اكتب تفاصيل النقص أو عدم التطابق"
      />

      {state.kind === "error" ? (
        <Text role="bodySm" tone="danger">{state.message}</Text>
      ) : null}

      <Box layoutDirection="row" gap={2}>
        <Button
          label="تسجيل الاستثناء"
          tone="danger"
          size="sm"
          fullWidth={false}
          onPress={() => void onSubmit()}
        />
        <Button
          label="إلغاء"
          tone="ghost"
          size="sm"
          fullWidth={false}
          onPress={onCancel}
        />
      </Box>
    </Box>
  );
}

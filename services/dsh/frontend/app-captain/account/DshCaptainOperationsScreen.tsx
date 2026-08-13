import React from "react";
import { Box, Button, StateView, Text } from "@bthwani/ui-kit";
import type { CaptainSupportRoute } from "../../shared/delivery";

const SUPPORT_ENTRIES: ReadonlyArray<{
  readonly id: CaptainSupportRoute;
  readonly title: string;
  readonly description: string;
  readonly requiresOrder: boolean;
}> = [
  {
    id: "chat-send",
    title: "محادثة دعم الطلب",
    description: "افتح محادثة DSH مرتبطة بالمهمة النشطة وأرسل تحديثًا تشغيليًا.",
    requiresOrder: true,
  },
  {
    id: "chat-read-ack",
    title: "قراءة محادثة الدعم",
    description: "اقرأ الرسائل الحالية وحدّث حالة القراءة من المصدر الحاكم.",
    requiresOrder: true,
  },
  {
    id: "cod-liability",
    title: "ذمة COD",
    description: "اقرأ سجل العهدة والالتزامات من WLT دون إدخال قيم مالية محلية.",
    requiresOrder: false,
  },
];

export function DshCaptainSupportDirectoryScreen({
  activeOrderId,
  onOpenScreen,
}: {
  readonly activeOrderId?: string;
  readonly onOpenScreen?: (screenId: CaptainSupportRoute) => void;
}) {
  return (
    <Box gap={4}>
      <Box gap={1}>
        <Text role="titleMd">الدعم التشغيلي</Text>
        <Text role="bodySm" tone="muted">
          اختر مسارًا حقيقيًا مرتبطًا بالمهمة أو بقراءة WLT. لا تُعرض بيانات تشغيلية أو مالية قبل القراءة من المالك الحاكم.
        </Text>
      </Box>
      {SUPPORT_ENTRIES.map((entry) => {
        const unavailable = entry.requiresOrder && !activeOrderId;
        return (
          <Box key={entry.id} gap={2}>
            <Text role="bodyStrong">{entry.title}</Text>
            <Text role="bodySm" tone="muted">{entry.description}</Text>
            <Button
              label={unavailable ? "افتح مهمة نشطة أولًا" : "فتح المسار"}
              tone="secondary"
              disabled={unavailable}
              onPress={() => onOpenScreen?.(entry.id)}
            />
          </Box>
        );
      })}
      {!activeOrderId ? (
        <StateView
          title="لا توجد مهمة نشطة"
          description="محادثة الدعم التشغيلي لا تُنشأ إلا بمعرف مهمة DSH حقيقي."
          tone="warning"
        />
      ) : null}
    </Box>
  );
}

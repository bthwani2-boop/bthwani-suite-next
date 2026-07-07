"use client";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (settings/overview). hero: forbidden. state: blocked (API not connected).
import React from "react";
import { Box, Surface, Text, Button } from "@bthwani/ui-kit";
import { WebSectionCard } from "@bthwani/ui-kit/web";
import styles from "../shared/control-panel-surface.module.css";

export function ControlPanelHrScreen() {
  return (
    <Box
      paddingX={4}
      paddingY={4}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/*
        Grammar Contract Check:
        - Hero Policy: Forbidden in operational sections. The shell provides the surface title.
        - Micro Actions Grammar: disabled when no backend handler exists.
      */}
      {/* Grammar Gate 3 — blocked state: reason stated, next action clear */}
      <Box style={{ flexShrink: 0, paddingBottom: 24 }}>
        <Surface tone="warning" padding={3}>
          <Text role="bodySm" tone="warning" align="center">
            ⛔ قسم الموارد البشرية محجوب — لا يوجد API أو قاعدة بيانات في هذه المرحلة.
            الإجراء التالي: ربط backend HR قبل تفعيل أي action.
            جميع الأزرار معطّلة بسبب غياب الـ runtime.
          </Text>
        </Surface>
      </Box>

      <Box style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
        <Box gap={4}>
          <WebSectionCard
            title="فريق التشغيل"
            description="استعراض أفراد فريق التشغيل وحالتهم الحالية."
          >
            <Surface tone="raised" padding={4}>
              <Box
                layoutDirection="row"
                justify="space-between"
                align="center"
                style={{ flexWrap: "wrap", gap: "16px" }}
              >
                <Text role="bodySm" tone="muted">
                  قائمة الفريق للعرض فقط.
                </Text>
                <Button
                  tone="secondary"
                  label="استعراض الفريق (محاكاة)"
                  disabled
                  accessibilityLabel="مغلق لعدم توفر API محلي للتشغيل"
                  onPress={() => {}}
                />
              </Box>
            </Surface>
          </WebSectionCard>

          <WebSectionCard
            title="الجاهزية والحضور"
            description="تتبع جاهزية الموظفين وجدول المناوبات."
          >
            <Surface tone="default" padding={4}>
              <Box
                layoutDirection="row"
                justify="space-between"
                align="center"
                style={{ flexWrap: "wrap", gap: "16px" }}
              >
                <Text role="bodySm" tone="muted">
                  حالة الجاهزية الحالية.
                </Text>
                <Button
                  tone="secondary"
                  label="مراجعة الجاهزية"
                  disabled
                  accessibilityLabel="لا توجد بيانات جاهزية متاحة"
                  onPress={() => {}}
                />
              </Box>
            </Surface>
          </WebSectionCard>

          <WebSectionCard
            title="أدوار HR"
            description="الأدوار والصلاحيات المخصصة لمهام الموارد البشرية."
          >
            <Surface tone="raised" padding={4}>
              <Box
                layoutDirection="row"
                justify="space-between"
                align="center"
                style={{ flexWrap: "wrap", gap: "16px" }}
              >
                <Text role="bodySm" tone="muted">
                  توزيع الأدوار الداخلية للقسم.
                </Text>
                <Button
                  tone="secondary"
                  label="عرض الأدوار (محاكاة)"
                  disabled
                  accessibilityLabel="مغلق في وضع Demo"
                  onPress={() => {}}
                />
              </Box>
            </Surface>
          </WebSectionCard>

          <WebSectionCard
            title="طلبات الموارد البشرية"
            description="الإجازات، والموافقات التشغيلية للموظفين."
          >
            <Surface tone="inset" padding={4}>
              <Box
                layoutDirection="row"
                justify="space-between"
                align="center"
                style={{ flexWrap: "wrap", gap: "16px" }}
              >
                <Text role="bodySm" tone="muted">
                  لا توجد طلبات حقيقية.
                </Text>
                <Button
                  tone="primary"
                  label="عرض الطلبات التجريبية"
                  disabled
                  accessibilityLabel="مغلق - لا يوجد backend"
                  onPress={() => {}}
                />
              </Box>
            </Surface>
          </WebSectionCard>

          <WebSectionCard
            title="سياسات الموظفين"
            description="اللوائح الداخلية، التوجيهات، وإرشادات الجاهزية."
          >
            <Surface tone="default" padding={4}>
              <Box
                layoutDirection="row"
                justify="space-between"
                align="center"
                style={{ flexWrap: "wrap", gap: "16px" }}
              >
                <Text role="bodySm" tone="muted">
                  السياسات الحالية للمنصة.
                </Text>
                <Button
                  tone="secondary"
                  label="استعراض السياسات"
                  disabled
                  accessibilityLabel="السياسات غير متاحة في Preview"
                  onPress={() => {}}
                />
              </Box>
            </Surface>
          </WebSectionCard>
        </Box>
      </Box>
    </Box>
  );
}

export default ControlPanelHrScreen;

"use client";

import React from "react";
import { Card, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  CpBadge,
  CpButton,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import {
  useServiceAreaController,
  type DshServiceArea,
} from "../../shared/client-map";

type FormState = {
  serviceAreaCode: string;
  displayName: string;
  polygonText: string;
  priority: string;
  active: boolean;
  expectedVersion: number;
  reason: string;
};

const EMPTY_FORM: FormState = {
  serviceAreaCode: "",
  displayName: "",
  polygonText: "",
  priority: "100",
  active: true,
  expectedVersion: 0,
  reason: "",
};

function polygonToText(polygon: DshServiceArea["polygon"]): string {
  return JSON.stringify(polygon, null, 2);
}

function parsePolygon(text: string): readonly (readonly [number, number])[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("المضلع يجب أن يكون JSON صالحًا.");
  }
  if (!Array.isArray(value) || value.length < 3 || value.length > 10000) {
    throw new Error("المضلع يحتاج ثلاث نقاط على الأقل وبحد أقصى 10000 نقطة.");
  }
  const polygon: [number, number][] = [];
  for (const point of value) {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      typeof point[0] !== "number" ||
      typeof point[1] !== "number" ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1]) ||
      point[0] < -180 ||
      point[0] > 180 ||
      point[1] < -90 ||
      point[1] > 90
    ) {
      throw new Error(
        "كل نقطة يجب أن تكون [longitude, latitude] ضمن الحدود الجغرافية.",
      );
    }
    polygon.push([point[0], point[1]]);
  }
  return polygon;
}

function formatBounds(area: DshServiceArea): string {
  const bounds = area.bounds;
  return `${bounds.minLongitude.toFixed(4)}, ${bounds.minLatitude.toFixed(4)} → ${bounds.maxLongitude.toFixed(4)}, ${bounds.maxLatitude.toFixed(4)}`;
}

export function ServiceAreaGovernanceSection() {
  const controller = useServiceAreaController(true);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

  const edit = React.useCallback((area: DshServiceArea) => {
    setForm({
      serviceAreaCode: area.serviceAreaCode,
      displayName: area.displayName,
      polygonText: polygonToText(area.polygon),
      priority: String(area.priority),
      active: area.active,
      expectedVersion: area.version,
      reason: "",
    });
    setValidationError(null);
  }, []);

  const reset = React.useCallback(() => {
    setForm(EMPTY_FORM);
    setValidationError(null);
    controller.clearMutationError();
  }, [controller]);

  const save = React.useCallback(async () => {
    try {
      const serviceAreaCode = form.serviceAreaCode.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(serviceAreaCode)) {
        throw new Error(
          "رمز المنطقة يجب أن يتكون من أحرف إنجليزية صغيرة أو أرقام أو - أو _.",
        );
      }
      const displayName = form.displayName.trim();
      if (displayName.length < 2 || displayName.length > 160) {
        throw new Error("اسم المنطقة يجب أن يكون بين حرفين و160 حرفًا.");
      }
      const priority = Number(form.priority);
      if (!Number.isInteger(priority) || priority < 0 || priority > 100000) {
        throw new Error("الأولوية يجب أن تكون عددًا صحيحًا بين 0 و100000.");
      }
      const reason = form.reason.trim();
      if (reason.length < 3 || reason.length > 500) {
        throw new Error("اكتب سببًا واضحًا للتغيير بين 3 و500 حرف.");
      }
      const polygon = parsePolygon(form.polygonText);
      setValidationError(null);
      const saved = await controller.save(serviceAreaCode, {
        displayName,
        polygon,
        active: form.active,
        priority,
        expectedVersion: form.expectedVersion,
        reason,
      });
      if (saved) reset();
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "تعذر التحقق من المنطقة.",
      );
    }
  }, [controller, form, reset]);

  const tableRows =
    controller.state.kind === "success"
      ? (controller.state.data as unknown as (
          DshServiceArea & Record<string, unknown>
        )[])
      : [];

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text role="titleSm">المضلعات الجغرافية لمناطق الخدمة</Text>
          <Text role="caption" tone="muted">
            مزود الخرائط يحدد المكان فقط؛ DSH هو المصدر الوحيد لاعتماد رمز
            منطقة الخدمة عبر هذه المضلعات.
          </Text>
        </View>
        <CpButton variant="secondary" onClick={reset}>منطقة جديدة</CpButton>
      </View>

      {controller.state.kind === "loading" ? (
        <CpStatePanel role="status" title="جارٍ تحميل مناطق الخدمة…" />
      ) : null}
      {controller.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل مناطق الخدمة" description={controller.state.message}>
          <CpRetryButton onClick={controller.reload}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : null}
      {controller.state.kind === "success" ? (
        controller.state.data.length === 0 ? (
          <CpStatePanel
            role="status"
            title="لا توجد مضلعات معتمدة"
            description="لن يتم قبول أي عنوان للتوصيل حتى إنشاء منطقة خدمة نشطة."
          />
        ) : (
          <CpTable aria-label="مناطق الخدمة">
            <thead>
              <tr>
                <CpTableHeaderCell>المنطقة</CpTableHeaderCell>
                <CpTableHeaderCell>الرمز</CpTableHeaderCell>
                <CpTableHeaderCell>الأولوية</CpTableHeaderCell>
                <CpTableHeaderCell>النقاط</CpTableHeaderCell>
                <CpTableHeaderCell>الحدود</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.serviceAreaCode} onClick={() => edit(row)}>
                  <CpTableCell>{row.displayName}</CpTableCell>
                  <CpTableCell>{row.serviceAreaCode}</CpTableCell>
                  <CpTableCell>{String(row.priority)}</CpTableCell>
                  <CpTableCell>{String(row.pointCount)}</CpTableCell>
                  <CpTableCell>{formatBounds(row)}</CpTableCell>
                  <CpTableCell>
                    <CpBadge tone={row.active ? "success" : "neutral"}>{row.active ? "نشطة" : "معطلة"}</CpBadge>
                  </CpTableCell>
                  <CpTableCell>{String(row.version)}</CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )
      ) : null}

      <Card style={styles.formCard}>
        <Text role="titleSm">
          {form.expectedVersion > 0 ? "تعديل المنطقة" : "إنشاء منطقة"}
        </Text>
        {form.expectedVersion > 0 ? (
          <CpBadge tone="info">{`الإصدار ${form.expectedVersion}`}</CpBadge>
        ) : null}
        <CpTextInput
          aria-label="رمز منطقة الخدمة"
          value={form.serviceAreaCode}
          disabled={form.expectedVersion > 0}
          onChange={(serviceAreaCode) =>
            setForm((current) => ({ ...current, serviceAreaCode }))
          }
          placeholder="sanaa-old-city"
        />
        <CpTextInput
          aria-label="الاسم المعروض"
          value={form.displayName}
          onChange={(displayName) =>
            setForm((current) => ({ ...current, displayName }))
          }
        />
        {/* TextField kept: CpTextInput has no multiline support */}
        <TextField
          label="المضلع [longitude, latitude]"
          value={form.polygonText}
          onChangeText={(polygonText) =>
            setForm((current) => ({ ...current, polygonText }))
          }
          multiline
          placeholder={'[[44.1,15.3],[44.2,15.3],[44.2,15.4]]'}
        />
        <CpTextInput
          aria-label="الأولوية عند تداخل المضلعات"
          value={form.priority}
          onChange={(priority) =>
            setForm((current) => ({ ...current, priority }))
          }
        />
        <View style={styles.actions}>
          <CpButton
            variant={form.active ? "primary" : "secondary"}
            onClick={() =>
              setForm((current) => ({
                ...current,
                active: !current.active,
              }))
            }
          >
            {form.active ? "المنطقة نشطة" : "المنطقة معطلة"}
          </CpButton>
        </View>
        <CpTextInput
          aria-label="سبب التغيير"
          value={form.reason}
          onChange={(reason) =>
            setForm((current) => ({ ...current, reason }))
          }
          placeholder="سبب تشغيلي قابل للتدقيق"
        />
        {validationError ? (
          <Text tone="danger">{validationError}</Text>
        ) : null}
        {controller.mutationError ? (
          <Text tone="danger">{controller.mutationError}</Text>
        ) : null}
        <View style={styles.actions}>
          <CpButton
            variant="primary"
            disabled={controller.mutating}
            onClick={() => void save()}
          >
            {controller.mutating ? "جارٍ الحفظ…" : "حفظ المنطقة"}
          </CpButton>
          <CpButton
            variant="ghost"
            disabled={controller.mutating}
            onClick={reset}
          >
            إلغاء
          </CpButton>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[3] },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3],
  },
  headerText: { gap: spacing[1] },
  formCard: { padding: spacing[4], gap: spacing[3] },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});

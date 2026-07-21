"use client";

import React from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
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
        <Button label="منطقة جديدة" tone="secondary" onPress={reset} />
      </View>

      {controller.state.kind === "loading" ? (
        <StateView title="جارٍ تحميل مناطق الخدمة…" />
      ) : null}
      {controller.state.kind === "error" ? (
        <StateView
          title="تعذر تحميل مناطق الخدمة"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.reload}
        />
      ) : null}
      {controller.state.kind === "success" ? (
        controller.state.data.length === 0 ? (
          <StateView
            title="لا توجد مضلعات معتمدة"
            description="لن يتم قبول أي عنوان للتوصيل حتى إنشاء منطقة خدمة نشطة."
          />
        ) : (
          <DataTable<DshServiceArea & Record<string, unknown>>
            columns={[
              {
                key: "displayName",
                header: "المنطقة",
                render: (row) => row.displayName,
              },
              {
                key: "serviceAreaCode",
                header: "الرمز",
                render: (row) => row.serviceAreaCode,
              },
              {
                key: "priority",
                header: "الأولوية",
                render: (row) => String(row.priority),
              },
              {
                key: "polygon",
                header: "النقاط",
                render: (row) => String(row.polygon.length),
              },
              {
                key: "active",
                header: "الحالة",
                render: (row) => (
                  <Badge
                    label={row.active ? "نشطة" : "معطلة"}
                    tone={row.active ? "success" : "neutral"}
                  />
                ),
              },
              {
                key: "version",
                header: "الإصدار",
                render: (row) => String(row.version),
              },
            ]}
            rows={tableRows}
            getRowKey={(row) => row.serviceAreaCode}
            onRowPress={edit}
          />
        )
      ) : null}

      <Card style={styles.formCard}>
        <Text role="titleSm">
          {form.expectedVersion > 0 ? "تعديل المنطقة" : "إنشاء منطقة"}
        </Text>
        {form.expectedVersion > 0 ? (
          <Badge label={`الإصدار ${form.expectedVersion}`} tone="info" />
        ) : null}
        <TextField
          label="رمز منطقة الخدمة"
          value={form.serviceAreaCode}
          disabled={form.expectedVersion > 0}
          onChangeText={(serviceAreaCode) =>
            setForm((current) => ({ ...current, serviceAreaCode }))
          }
          placeholder="sanaa-old-city"
        />
        <TextField
          label="الاسم المعروض"
          value={form.displayName}
          onChangeText={(displayName) =>
            setForm((current) => ({ ...current, displayName }))
          }
        />
        <TextField
          label="المضلع [longitude, latitude]"
          value={form.polygonText}
          onChangeText={(polygonText) =>
            setForm((current) => ({ ...current, polygonText }))
          }
          multiline
          placeholder={'[[44.1,15.3],[44.2,15.3],[44.2,15.4]]'}
        />
        <TextField
          label="الأولوية عند تداخل المضلعات"
          value={form.priority}
          onChangeText={(priority) =>
            setForm((current) => ({ ...current, priority }))
          }
          keyboardType="numeric"
        />
        <View style={styles.actions}>
          <Button
            label={form.active ? "المنطقة نشطة" : "المنطقة معطلة"}
            tone={form.active ? "primary" : "secondary"}
            onPress={() =>
              setForm((current) => ({
                ...current,
                active: !current.active,
              }))
            }
          />
        </View>
        <TextField
          label="سبب التغيير"
          value={form.reason}
          onChangeText={(reason) =>
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
          <Button
            label={controller.mutating ? "جارٍ الحفظ…" : "حفظ المنطقة"}
            tone="primary"
            disabled={controller.mutating}
            onPress={() => void save()}
          />
          <Button
            label="إلغاء"
            tone="ghost"
            disabled={controller.mutating}
            onPress={reset}
          />
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

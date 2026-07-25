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
  useAreaCapacityController,
  useOperationalPolicyEditor,
  useSlaRulesController,
  useZonesController,
  type DshCapacityConfig,
  type DshSlaRule,
  type DshZone,
} from "../../shared/platform";

type ZoneForm = {
  id: string;
  name: string;
  cityCode: string;
  description: string;
  isActive: boolean;
  reason: string;
};

type SlaForm = {
  category: string;
  maxPrepMins: string;
  maxDeliveryMins: string;
  reason: string;
};

type CapacityForm = {
  maxConcurrentOrders: string;
  maxCaptainsOnline: string;
  throttleThreshold: string;
  reason: string;
};

const EMPTY_ZONE: ZoneForm = {
  id: "",
  name: "",
  cityCode: "",
  description: "",
  isActive: true,
  reason: "",
};

const EMPTY_SLA: SlaForm = {
  category: "default",
  maxPrepMins: "20",
  maxDeliveryMins: "45",
  reason: "",
};

const EMPTY_CAPACITY: CapacityForm = {
  maxConcurrentOrders: "100",
  maxCaptainsOnline: "30",
  throttleThreshold: "0.8",
  reason: "",
};

function integerValue(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} يجب أن يكون عددًا صحيحًا بين ${minimum} و${maximum}.`);
  }
  return parsed;
}

function thresholdValue(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error("عتبة الخنق يجب أن تكون رقمًا بين 0 و1.");
  }
  return parsed;
}

function requiredReason(value: string): string {
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new Error("اكتب سببًا واضحًا للتغيير بين 3 و500 حرف.");
  }
  return reason;
}

export function OperationalPolicyGovernanceSection() {
  const zones = useZonesController("authenticated");
  const sla = useSlaRulesController("authenticated");
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | undefined>();
  const capacity = useAreaCapacityController("authenticated", selectedZoneId);
  const [selectedSlaKey, setSelectedSlaKey] = React.useState<string | null>(null);
  const [zoneForm, setZoneForm] = React.useState<ZoneForm>(EMPTY_ZONE);
  const [slaForm, setSlaForm] = React.useState<SlaForm>(EMPTY_SLA);
  const [capacityForm, setCapacityForm] = React.useState<CapacityForm>(EMPTY_CAPACITY);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const selectedZone = React.useMemo(
    () =>
      zones.state.kind === "success"
        ? zones.state.data.find((zone) => zone.id === selectedZoneId) ?? null
        : null,
    [selectedZoneId, zones.state],
  );

  const selectedSla = React.useMemo(
    () =>
      sla.state.kind === "success" && selectedSlaKey
        ? sla.state.data.find(
            (rule) => `${rule.zoneId}:${rule.category}` === selectedSlaKey,
          ) ?? null
        : null,
    [selectedSlaKey, sla.state],
  );

  const currentCapacity: DshCapacityConfig | null =
    capacity.state.kind === "success"
      ? capacity.state.data.capacityConfig
      : null;

  React.useEffect(() => {
    if (zones.state.kind !== "success" || zones.state.data.length === 0) return;
    if (!selectedZoneId) setSelectedZoneId(zones.state.data[0]?.id);
  }, [selectedZoneId, zones.state]);

  React.useEffect(() => {
    if (!selectedZone) return;
    setZoneForm({
      id: selectedZone.id,
      name: selectedZone.name,
      cityCode: selectedZone.cityCode,
      description: selectedZone.description,
      isActive: selectedZone.isActive,
      reason: "",
    });
  }, [selectedZone]);

  React.useEffect(() => {
    if (!selectedSla) return;
    setSlaForm({
      category: selectedSla.category,
      maxPrepMins: String(selectedSla.maxPrepMins),
      maxDeliveryMins: String(selectedSla.maxDeliveryMins),
      reason: "",
    });
  }, [selectedSla]);

  React.useEffect(() => {
    if (!currentCapacity) {
      setCapacityForm(EMPTY_CAPACITY);
      return;
    }
    setCapacityForm({
      maxConcurrentOrders: String(currentCapacity.maxConcurrentOrders),
      maxCaptainsOnline: String(currentCapacity.maxCaptainsOnline),
      throttleThreshold: String(currentCapacity.throttleThreshold),
      reason: "",
    });
  }, [currentCapacity]);

  const reloadAll = React.useCallback(async () => {
    await Promise.all([zones.reload(), sla.reload(), capacity.reload()]);
  }, [capacity, sla, zones]);
  const editor = useOperationalPolicyEditor(reloadAll);

  const chooseZone = React.useCallback((zone: DshZone) => {
    setSelectedZoneId(zone.id);
    setSelectedSlaKey(null);
    setValidationError(null);
  }, []);

  const beginZoneCreate = React.useCallback(() => {
    setSelectedZoneId(undefined);
    setSelectedSlaKey(null);
    setZoneForm(EMPTY_ZONE);
    setValidationError(null);
    editor.clearError();
  }, [editor]);

  const saveZone = React.useCallback(async () => {
    try {
      const name = zoneForm.name.trim();
      const cityCode = zoneForm.cityCode.trim().toLowerCase();
      if (name.length < 2 || name.length > 160) {
        throw new Error("اسم المنطقة يجب أن يكون بين حرفين و160 حرفًا.");
      }
      if (cityCode.length < 1 || cityCode.length > 80) {
        throw new Error("رمز المدينة غير صالح.");
      }
      const reason = requiredReason(zoneForm.reason);
      setValidationError(null);
      const ok = await editor.saveZone(selectedZone, {
        ...(!selectedZone && zoneForm.id.trim() ? { id: zoneForm.id.trim().toLowerCase() } : {}),
        name,
        cityCode,
        description: zoneForm.description.trim(),
        isActive: zoneForm.isActive,
        reason,
      });
      if (ok) setZoneForm((current) => ({ ...current, reason: "" }));
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "بيانات المنطقة غير صالحة.");
    }
  }, [editor, selectedZone, zoneForm]);

  const saveSla = React.useCallback(async () => {
    if (!selectedZoneId) {
      setValidationError("اختر منطقة تشغيلية أولًا.");
      return;
    }
    try {
      const category = slaForm.category.trim().toLowerCase();
      if (!category || category.length > 120) {
        throw new Error("فئة SLA غير صالحة.");
      }
      const ok = await editor.saveSla(selectedSla, {
        zoneId: selectedZoneId,
        category,
        maxPrepMins: integerValue(slaForm.maxPrepMins, "حد التحضير", 1, 1440),
        maxDeliveryMins: integerValue(
          slaForm.maxDeliveryMins,
          "حد التوصيل",
          1,
          1440,
        ),
        reason: requiredReason(slaForm.reason),
      });
      if (ok) setSlaForm((current) => ({ ...current, reason: "" }));
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "بيانات SLA غير صالحة.");
    }
  }, [editor, selectedSla, selectedZoneId, slaForm]);

  const saveCapacity = React.useCallback(async () => {
    if (!selectedZoneId) {
      setValidationError("اختر منطقة تشغيلية أولًا.");
      return;
    }
    try {
      const ok = await editor.saveCapacity(currentCapacity, {
        zoneId: selectedZoneId,
        maxConcurrentOrders: integerValue(
          capacityForm.maxConcurrentOrders,
          "الطلبات المتزامنة",
          1,
          1000000,
        ),
        maxCaptainsOnline: integerValue(
          capacityForm.maxCaptainsOnline,
          "الكباتن المتصلون",
          0,
          1000000,
        ),
        throttleThreshold: thresholdValue(capacityForm.throttleThreshold),
        reason: requiredReason(capacityForm.reason),
      });
      if (ok) setCapacityForm((current) => ({ ...current, reason: "" }));
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "بيانات السعة غير صالحة.");
    }
  }, [capacityForm, currentCapacity, editor, selectedZoneId]);

  const zoneRows =
    zones.state.kind === "success"
      ? (zones.state.data as unknown as (DshZone & Record<string, unknown>)[])
      : [];
  const slaRows =
    sla.state.kind === "success"
      ? (sla.state.data as unknown as (
          DshSlaRule & Record<string, unknown>
        )[])
      : [];

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text role="titleSm">مناطق التشغيل وSLA والسعة</Text>
          <Text role="caption" tone="muted">
            كل كتابة تعتمد الإصدار الحالي وتُسجّل بسبب واضح ومفتاح idempotency.
          </Text>
        </View>
        <CpButton variant="secondary" onClick={beginZoneCreate}>منطقة تشغيلية جديدة</CpButton>
      </View>

      {zones.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل المناطق…" /> : null}
      {zones.state.kind === "error" ? (
        <CpStatePanel role="alert" title="تعذر تحميل المناطق" description={zones.state.message}>
          <CpRetryButton onClick={zones.reload}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      ) : null}
      {zones.state.kind === "success" && zones.state.data.length > 0 ? (
        <CpTable aria-label="المناطق التشغيلية">
          <thead>
            <tr>
              <CpTableHeaderCell>المنطقة</CpTableHeaderCell>
              <CpTableHeaderCell>رمز المدينة</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {zoneRows.map((row) => (
              <tr key={row.id} onClick={() => chooseZone(row)}>
                <CpTableCell>{row.name}</CpTableCell>
                <CpTableCell>{row.cityCode}</CpTableCell>
                <CpTableCell>
                  <CpBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "نشطة" : "معطلة"}</CpBadge>
                </CpTableCell>
                <CpTableCell>{String(row.version)}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}

      <Card style={styles.card}>
        <Text role="titleSm">{selectedZone ? "تعديل المنطقة التشغيلية" : "إنشاء منطقة تشغيلية"}</Text>
        {selectedZone ? <CpBadge tone="info">{`الإصدار ${selectedZone.version}`}</CpBadge> : null}
        {!selectedZone ? (
          <CpTextInput
            aria-label="معرف ثابت اختياري"
            value={zoneForm.id}
            onChange={(id) => setZoneForm((current) => ({ ...current, id }))}
            placeholder="sanaa"
          />
        ) : null}
        <CpTextInput
          aria-label="اسم المنطقة"
          value={zoneForm.name}
          onChange={(name) => setZoneForm((current) => ({ ...current, name }))}
        />
        <CpTextInput
          aria-label="رمز المدينة أو منطقة الخدمة"
          value={zoneForm.cityCode}
          disabled={Boolean(selectedZone)}
          onChange={(cityCode) =>
            setZoneForm((current) => ({ ...current, cityCode }))
          }
        />
        {/* TextField kept: CpTextInput has no multiline support */}
        <TextField
          label="الوصف"
          value={zoneForm.description}
          onChangeText={(description) =>
            setZoneForm((current) => ({ ...current, description }))
          }
          multiline
        />
        <CpButton
          variant={zoneForm.isActive ? "primary" : "secondary"}
          onClick={() =>
            setZoneForm((current) => ({ ...current, isActive: !current.isActive }))
          }
        >
          {zoneForm.isActive ? "نشطة" : "معطلة"}
        </CpButton>
        <CpTextInput
          aria-label="سبب التغيير"
          value={zoneForm.reason}
          onChange={(reason) => setZoneForm((current) => ({ ...current, reason }))}
        />
        <CpButton
          variant="primary"
          disabled={editor.mutating}
          onClick={() => void saveZone()}
        >
          {editor.mutating ? "جارٍ الحفظ…" : "حفظ المنطقة"}
        </CpButton>
      </Card>

      {selectedZoneId ? (
        <>
          <Card style={styles.card}>
            <Text role="titleSm">قواعد SLA للمنطقة المحددة</Text>
            {slaRows.length > 0 ? (
              <CpTable aria-label="قواعد SLA">
                <thead>
                  <tr>
                    <CpTableHeaderCell>الفئة</CpTableHeaderCell>
                    <CpTableHeaderCell>التحضير</CpTableHeaderCell>
                    <CpTableHeaderCell>التوصيل</CpTableHeaderCell>
                    <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {slaRows
                    .filter((row) => row.zoneId === selectedZoneId)
                    .map((row) => (
                      <tr key={`${row.zoneId}:${row.category}`} onClick={() => setSelectedSlaKey(`${row.zoneId}:${row.category}`)}>
                        <CpTableCell>{row.category}</CpTableCell>
                        <CpTableCell>{String(row.maxPrepMins)}</CpTableCell>
                        <CpTableCell>{String(row.maxDeliveryMins)}</CpTableCell>
                        <CpTableCell>{String(row.version)}</CpTableCell>
                      </tr>
                    ))}
                </tbody>
              </CpTable>
            ) : null}
            <CpTextInput
              aria-label="الفئة"
              value={slaForm.category}
              onChange={(category) => setSlaForm((current) => ({ ...current, category }))}
            />
            <CpTextInput
              aria-label="حد التحضير بالدقائق"
              value={slaForm.maxPrepMins}
              onChange={(maxPrepMins) =>
                setSlaForm((current) => ({ ...current, maxPrepMins }))
              }
            />
            <CpTextInput
              aria-label="حد التوصيل بالدقائق"
              value={slaForm.maxDeliveryMins}
              onChange={(maxDeliveryMins) =>
                setSlaForm((current) => ({ ...current, maxDeliveryMins }))
              }
            />
            <CpTextInput
              aria-label="سبب التغيير"
              value={slaForm.reason}
              onChange={(reason) => setSlaForm((current) => ({ ...current, reason }))}
            />
            <CpButton
              variant="primary"
              disabled={editor.mutating}
              onClick={() => void saveSla()}
            >
              {editor.mutating ? "جارٍ الحفظ…" : "حفظ SLA"}
            </CpButton>
          </Card>

          <Card style={styles.card}>
            <Text role="titleSm">السعة التشغيلية</Text>
            {capacity.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل السعة…" /> : null}
            {capacity.state.kind === "error" ? (
              <CpStatePanel role="alert" title="تعذر تحميل السعة" description={capacity.state.message}>
                <CpRetryButton onClick={capacity.reload}>إعادة المحاولة</CpRetryButton>
              </CpStatePanel>
            ) : null}
            {capacity.state.kind === "success" ? (
              <View style={styles.badges}>
                <CpBadge tone={capacity.state.data.serviceability.isActive ? "success" : "warning"}>
                  {capacity.state.data.serviceability.isActive ? "المنطقة نشطة" : "المنطقة معطلة"}
                </CpBadge>
                <CpBadge tone="info">{`${capacity.state.data.serviceability.activeStores} متجر ظاهر`}</CpBadge>
                <CpBadge tone={capacity.state.data.serviceability.slaAvailable ? "success" : "warning"}>
                  {capacity.state.data.serviceability.slaAvailable ? "SLA متاح" : "SLA غير معرف"}
                </CpBadge>
                {currentCapacity ? <CpBadge tone="info">{`الإصدار ${currentCapacity.version}`}</CpBadge> : null}
              </View>
            ) : null}
            <CpTextInput
              aria-label="أقصى طلبات متزامنة"
              value={capacityForm.maxConcurrentOrders}
              onChange={(maxConcurrentOrders) =>
                setCapacityForm((current) => ({ ...current, maxConcurrentOrders }))
              }
            />
            <CpTextInput
              aria-label="أقصى كباتن متصلين"
              value={capacityForm.maxCaptainsOnline}
              onChange={(maxCaptainsOnline) =>
                setCapacityForm((current) => ({ ...current, maxCaptainsOnline }))
              }
            />
            <CpTextInput
              aria-label="عتبة الخنق 0-1"
              value={capacityForm.throttleThreshold}
              onChange={(throttleThreshold) =>
                setCapacityForm((current) => ({ ...current, throttleThreshold }))
              }
            />
            <CpTextInput
              aria-label="سبب التغيير"
              value={capacityForm.reason}
              onChange={(reason) =>
                setCapacityForm((current) => ({ ...current, reason }))
              }
            />
            <CpButton
              variant="primary"
              disabled={editor.mutating}
              onClick={() => void saveCapacity()}
            >
              {editor.mutating ? "جارٍ الحفظ…" : "حفظ السعة"}
            </CpButton>
          </Card>
        </>
      ) : null}

      {validationError ? <Text tone="danger">{validationError}</Text> : null}
      {editor.error ? <Text tone="danger">{editor.error}</Text> : null}
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
  card: { padding: spacing[4], gap: spacing[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});

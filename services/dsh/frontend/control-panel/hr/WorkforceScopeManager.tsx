"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, Text, spacing } from "@bthwani/ui-kit";

import {
  fetchWorkforceScopeOptions,
  getWorkforceScopes,
  replaceWorkforceScopes,
  workforceErrorMessage,
  type WorkforceScopeActorRole,
  type WorkforceScopeStoreOption,
} from "../../shared/workforce";

export function WorkforceScopeManager(props: {
  readonly actorId: string;
  readonly actorRole: WorkforceScopeActorRole;
}) {
  const [options, setOptions] = useState<readonly WorkforceScopeStoreOption[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<readonly string[]>([]);
  const [selectedAreaCodes, setSelectedAreaCodes] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [storeOptions, snapshot] = await Promise.all([
        fetchWorkforceScopeOptions(),
        getWorkforceScopes(props.actorId, props.actorRole),
      ]);
      setOptions(storeOptions);
      setSelectedStoreIds(snapshot.storeIds);
      setSelectedAreaCodes(snapshot.serviceAreaCodes);
    } catch (err) {
      setError(workforceErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [props.actorId, props.actorRole]);

  const areas = useMemo(() => {
    const byCode = new Map<string, { code: string; cities: Set<string>; stores: number }>();
    for (const option of options) {
      const current = byCode.get(option.serviceAreaCode) ?? {
        code: option.serviceAreaCode,
        cities: new Set<string>(),
        stores: 0,
      };
      if (option.cityCode) current.cities.add(option.cityCode);
      current.stores += 1;
      byCode.set(option.serviceAreaCode, current);
    }
    return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [options]);

  const toggleStore = (storeId: string) => {
    setSaved(false);
    setSelectedStoreIds((current) =>
      current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId],
    );
  };

  const toggleArea = (areaCode: string) => {
    setSaved(false);
    setSelectedAreaCodes((current) =>
      current.includes(areaCode) ? current.filter((code) => code !== areaCode) : [...current, areaCode],
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const snapshot = await replaceWorkforceScopes({
        actorId: props.actorId,
        actorRole: props.actorRole,
        storeIds: selectedStoreIds,
        serviceAreaCodes: selectedAreaCodes,
      });
      setSelectedStoreIds(snapshot.storeIds);
      setSelectedAreaCodes(snapshot.serviceAreaCodes);
      setSaved(true);
    } catch (err) {
      setError(workforceErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ padding: spacing[4], gap: spacing[3] }}>
      <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="titleSm" style={{ textAlign: "right" }}>نطاقات DSH التشغيلية</Text>
        <Button label="إعادة تحميل" tone="ghost" disabled={loading || saving} onPress={() => void reload()} />
      </Box>
      <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
        التعيينات مرتبطة مباشرةً بـ actor_id. نطاق المتجر يصرح بمتجر محدد، ونطاق المنطقة يصرح بكل المتاجر الحالية والمستقبلية داخل رمز منطقة الخدمة.
      </Text>

      {loading ? <Text role="bodySm" tone="muted" align="center">جارٍ تحميل النطاقات…</Text> : null}
      {error ? <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{error}</Text> : null}
      {saved ? <Text role="bodySm" tone="success" style={{ textAlign: "right" }}>تم حفظ النطاقات وتسجيل التغيير.</Text> : null}

      {!loading ? (
        <>
          <Text role="bodyStrong" style={{ textAlign: "right" }}>مناطق الخدمة</Text>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
            {areas.map((area) => (
              <Button
                key={area.code}
                label={`${area.code} · ${area.stores} متجر`}
                tone={selectedAreaCodes.includes(area.code) ? "primary" : "ghost"}
                disabled={saving}
                onPress={() => toggleArea(area.code)}
              />
            ))}
          </Box>

          <Text role="bodyStrong" style={{ textAlign: "right" }}>المتاجر المحددة</Text>
          <Box style={{ gap: spacing[2] }}>
            {options.map((store) => (
              <Box key={store.id} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] }}>
                <Box style={{ alignItems: "flex-end", flex: 1 }}>
                  <Text role="bodySm">{store.displayName}</Text>
                  <Text role="caption" tone="muted">{store.id} · {store.serviceAreaCode}</Text>
                </Box>
                <Button
                  label={selectedStoreIds.includes(store.id) ? "محدد ✓" : "تحديد"}
                  tone={selectedStoreIds.includes(store.id) ? "primary" : "secondary"}
                  disabled={saving}
                  onPress={() => toggleStore(store.id)}
                />
              </Box>
            ))}
          </Box>

          <Button
            label="حفظ نطاقات DSH"
            tone="primary"
            loading={saving}
            disabled={saving || (selectedStoreIds.length === 0 && selectedAreaCodes.length === 0)}
            onPress={() => void save()}
          />
        </>
      ) : null}
    </Card>
  );
}

export default WorkforceScopeManager;

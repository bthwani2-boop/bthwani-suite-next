"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CpBadge, CpButton, CpMutedInline, CpStateView } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";

import {
  fetchWorkforceScopeOptions,
  getWorkforceScopes,
  replaceWorkforceScopes,
  workforceErrorMessage,
  type WorkforceScopeActorRole,
  type WorkforceScopeStoreOption } from "../../shared/workforce";

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
        stores: 0 };
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
        serviceAreaCodes: selectedAreaCodes });
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="titleSm">نطاقات DSH التشغيلية</Text>
        <CpButton variant="ghost" disabled={loading || saving} onClick={() => void reload()}>إعادة تحميل</CpButton>
      </div>
      <CpMutedInline>
        التعيينات مرتبطة مباشرةً بـ actor_id. نطاق المتجر يصرح بمتجر محدد، ونطاق المنطقة يصرح بكل المتاجر الحالية والمستقبلية داخل رمز منطقة الخدمة.
      </CpMutedInline>

      {loading ? <CpStateView kind="loading" title="جارٍ تحميل النطاقات…" /> : null}
      {error ? <CpStateView kind="error" title={error} /> : null}
      {saved ? <CpBadge tone="success">تم حفظ النطاقات وتسجيل التغيير.</CpBadge> : null}

      {!loading ? (
        <>
          <Text role="bodyStrong">مناطق الخدمة</Text>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {areas.map((area) => (
              <CpButton
                key={area.code}
                variant={selectedAreaCodes.includes(area.code) ? "primary" : "ghost"}
                disabled={saving}
                onClick={() => toggleArea(area.code)}
              >
                {area.code} · {area.stores} متجر
              </CpButton>
            ))}
          </div>

          <Text role="bodyStrong">المتاجر المحددة</Text>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {options.map((store) => (
              <div key={store.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <Text role="bodySm">{store.displayName}</Text>
                  <CpMutedInline tight>{store.id} · {store.serviceAreaCode}</CpMutedInline>
                </div>
                <CpButton
                  variant={selectedStoreIds.includes(store.id) ? "primary" : "secondary"}
                  disabled={saving}
                  onClick={() => toggleStore(store.id)}
                >
                  {selectedStoreIds.includes(store.id) ? "محدد" : "تحديد"}
                </CpButton>
              </div>
            ))}
          </div>

          <CpButton
            variant="primary"
            disabled={saving || (selectedStoreIds.length === 0 && selectedAreaCodes.length === 0)}
            onClick={() => void save()}
          >
            {saving ? "جارٍ الحفظ…" : "حفظ نطاقات DSH"}
          </CpButton>
        </>
      ) : null}
    </div>
  );
}

export default WorkforceScopeManager;

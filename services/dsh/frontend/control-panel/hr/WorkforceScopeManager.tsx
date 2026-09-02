"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CpBadge, CpMutedInline, CpStateView } from "@bthwani/control-panel/components";
import { Button, Text } from "@bthwani/ui-kit";

import {
  fetchWorkforceScopeOptions,
  getWorkforceScopes,
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
  const [error, setError] = useState<string | null>(null);

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



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="titleSm">نطاقات التشغيل (عبر DSH)</Text>
        <Button variant="ghost" disabled={loading} onClick={() => void reload()}>إعادة تحميل</Button>
      </div>
      <CpMutedInline>
        التعيينات مرتبطة مباشرةً بـ actor_id (نطاقات القراءة فقط في DSH). يتم تصريح المتجر أو المنطقة التشغيلية من خلال Workforce.
      </CpMutedInline>

      {loading ? <CpStateView kind="loading" title="جارٍ تحميل النطاقات…" /> : null}
      {error ? <CpStateView kind="error" title={error} /> : null}

      {!loading ? (
        <>
          <Text role="bodyStrong">مناطق الخدمة (قراءة فقط)</Text>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "16px" }}>
            {areas.map((area) => (
              <Button
                key={area.code}
                variant={selectedAreaCodes.includes(area.code) ? "primary" : "ghost"}
                disabled={true}
              >
                {area.code}
              </Button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default WorkforceScopeManager;

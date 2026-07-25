"use client";

// Service zone selection sources from DSH Platform Zones (the single
// source of truth for "where a provider works"), not from Workforce's own
// city table — Workforce mirrors the chosen zone's city locally only to
// keep its existing city_code foreign key satisfied.
import React, { useEffect, useState } from "react";
import { CpMutedInline, CpTabs } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { fetchZones } from "../../shared/platform";
import type { DshZone } from "../../shared/platform";

export function ZonePicker(props: {
  readonly value: string;
  readonly onChange: (zone: DshZone | null) => void;
  readonly disabled?: boolean;
}) {
  const [zones, setZones] = useState<readonly DshZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchZones(false)
      .then(({ zones: result }) => {
        if (!cancelled) {
          setZones(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("تعذر تحميل مناطق الخدمة");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Text role="bodySm" style={{ fontWeight: "bold" }}>نطاق الخدمة *</Text>
      {loading ? <CpMutedInline>جارٍ تحميل مناطق الخدمة…</CpMutedInline> : null}
      {error ? <CpMutedInline>{error}</CpMutedInline> : null}
      {!loading && !error && zones.length === 0 ? (
        <CpMutedInline>لا توجد مناطق خدمة نشطة حاليًا</CpMutedInline>
      ) : null}
      {!props.disabled ? (
        <CpTabs
          aria-label="اختيار نطاق الخدمة"
          value={props.value}
          onChange={(zoneId) => {
            const zone = zones.find((z) => z.id === zoneId) ?? null;
            props.onChange(props.value === zoneId ? null : zone);
          }}
          items={zones.map((zone) => ({ value: zone.id, label: zone.name }))}
        />
      ) : (
        <Text role="bodySm">{zones.find((z) => z.id === props.value)?.name ?? "—"}</Text>
      )}
    </div>
  );
}

export default ZonePicker;

"use client";

// Service zone selection sources from DSH Platform Zones (the single
// source of truth for "where a provider works"), not from Workforce's own
// city table — Workforce mirrors the chosen zone's city locally only to
// keep its existing city_code foreign key satisfied.
import React, { useEffect, useState } from "react";
import { Box, Button, Text, spacing } from "@bthwani/ui-kit";
import { fetchZones } from "../../shared/platform-policies";
import type { DshZone } from "../../shared/platform-policies/platform-policies.types";

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
    <Box style={{ gap: spacing[2] }}>
      <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>نطاق الخدمة *</Text>
      {loading && (
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>جارٍ تحميل مناطق الخدمة…</Text>
      )}
      {error && (
        <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{error}</Text>
      )}
      {!loading && !error && zones.length === 0 && (
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>لا توجد مناطق خدمة نشطة حاليًا</Text>
      )}
      <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
        {zones.map((zone) => (
          <Button
            key={zone.id}
            label={zone.name}
            tone={props.value === zone.id ? "primary" : "ghost"}
            disabled={props.disabled}
            onPress={() => props.onChange(props.value === zone.id ? null : zone)}
          />
        ))}
      </Box>
    </Box>
  );
}

export default ZonePicker;

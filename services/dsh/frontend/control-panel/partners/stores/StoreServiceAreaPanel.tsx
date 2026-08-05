import React, { useEffect, useState } from "react";
import {
  CpButton,
  CpStateView,
  CpStatePanel,
  CpDescriptionRow,
} from "@bthwani/control-panel/components";
import { GoogleMapsWebCanvas } from "../../maps/GoogleMapsWebCanvas";
import {
  getDshOperatorServiceArea,
  upsertDshOperatorServiceArea,
} from "../../../shared/client-map/client-map.api";
import type { DshServiceArea } from "../../../shared/client-map/client-map.types";

type Props = {
  readonly serviceAreaCode: string;
};

export function StoreServiceAreaPanel({ serviceAreaCode }: Props) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; area: DshServiceArea; draftPolygon: readonly (readonly [number, number])[] }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });
    getDshOperatorServiceArea(serviceAreaCode)
      .then((area) => {
        if (!active) return;
        setState({ kind: "ready", area, draftPolygon: area.polygon });
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof Error && err.message.includes("404")) {
          // New service area? Actually the store has a serviceAreaCode, so it should exist,
          // but if it doesn't, we start empty.
          setState({
            kind: "ready",
            area: {
              serviceAreaCode,
              displayName: serviceAreaCode,
              polygon: [],
              pointCount: 0,
              bounds: { minLongitude: 0, minLatitude: 0, maxLongitude: 0, maxLatitude: 0 },
              active: true,
              priority: 100,
              version: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            draftPolygon: [],
          });
        } else {
          setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      active = false;
    };
  }, [serviceAreaCode]);

  const handleMapClick = (coord: { latitude: number; longitude: number }) => {
    if (state.kind !== "ready") return;
    setState({
      ...state,
      draftPolygon: [...state.draftPolygon, [coord.longitude, coord.latitude]],
    });
  };

  const handleClearDraft = () => {
    if (state.kind !== "ready") return;
    setState({ ...state, draftPolygon: [] });
  };

  const handleRevert = () => {
    if (state.kind !== "ready") return;
    setState({ ...state, draftPolygon: state.area.polygon });
  };

  const handleSave = async () => {
    if (state.kind !== "ready") return;
    if (state.draftPolygon.length > 0 && state.draftPolygon.length < 3) {
      setErrorMsg("يجب أن يحتوي المضلع على 3 نقاط على الأقل.");
      return;
    }
    
    // Close the polygon if it's not closed
    let finalPolygon = [...state.draftPolygon];
    if (finalPolygon.length >= 3) {
      const first = finalPolygon[0];
      const last = finalPolygon[finalPolygon.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        finalPolygon.push(first);
      }
    }

    setSaving(true);
    setErrorMsg("");
    try {
      const updated = await upsertDshOperatorServiceArea(serviceAreaCode, {
        displayName: state.area.displayName || serviceAreaCode,
        polygon: finalPolygon,
        active: state.area.active,
        priority: state.area.priority,
        expectedVersion: state.area.version,
        reason: "تحديث حدود المنطقة الجغرافية من لوحة التحكم",
      });
      setState({ kind: "ready", area: updated, draftPolygon: updated.polygon });
      alert("تم حفظ المنطقة الجغرافية بنجاح.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (state.kind === "loading") {
    return <CpStateView kind="loading" title="جاري تحميل المنطقة الجغرافية…" />;
  }
  if (state.kind === "error") {
    return <CpStatePanel role="alert" title="خطأ في تحميل المنطقة" description={state.message} />;
  }

  const { area, draftPolygon } = state;
  const isDirty = JSON.stringify(area.polygon) !== JSON.stringify(draftPolygon);

  return (
    <div style={{ marginTop: 24, borderTop: "1px solid var(--cp-border-color)", paddingTop: 24 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>محرر منطقة الخدمة ({serviceAreaCode})</h3>
      {errorMsg && (
        <div style={{ color: "red", marginBottom: 16, padding: 12, backgroundColor: "#fee" }}>
          {errorMsg}
        </div>
      )}
      <CpDescriptionRow label="المضلع الحالي">
        <GoogleMapsWebCanvas
          height={400}
          onMapClick={handleMapClick}
          polygons={[
            {
              id: "draft",
              label: "مسودة",
              points: draftPolygon,
              active: true,
            },
            ...(isDirty && area.polygon.length > 0 ? [{
              id: "original",
              label: "الأصلي",
              points: area.polygon,
              active: false,
            }] : []),
          ]}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <CpButton onClick={() => void handleSave()} disabled={saving || !isDirty}>
            {saving ? "جاري الحفظ..." : "حفظ المسودة"}
          </CpButton>
          <CpButton onClick={handleClearDraft} disabled={draftPolygon.length === 0} kind="secondary">
            مسح النقاط
          </CpButton>
          <CpButton onClick={handleRevert} disabled={!isDirty} kind="secondary">
            إلغاء التعديلات
          </CpButton>
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: "var(--cp-text-muted)" }}>
          انقر على الخريطة لإضافة نقاط المضلع. تأكد من إغلاق المضلع (سيتم إغلاقه تلقائياً عند الحفظ).
          {draftPolygon.length > 0 && ` عدد النقاط: ${draftPolygon.length}`}
        </p>
      </CpDescriptionRow>
    </div>
  );
}

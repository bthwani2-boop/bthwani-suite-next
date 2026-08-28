"use client";

import React, { useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import { CpBadge, CpButton, CpMutedInline, CpPageHeader, CpStateView, CpTextInput } from "@bthwani/control-panel/components";
import { SettingsPageFrame } from "@bthwani/control-panel/shell";
import { Text } from "@bthwani/ui-kit";
import {
  createWorkforceCity,
  createWorkforceShift,
  updateWorkforceCity,
  updateWorkforceShift,
  useWorkforceReferenceData,
  workforceErrorMessage } from "../../shared/workforce";
import type { WorkforceCity, WorkforceShift } from "../../shared/workforce";
import { corrId } from "../../shared/_kernel/dsh-http-request";

export function WorkforceReferenceView(props: { readonly onBack: () => void }) {
  const reference = useWorkforceReferenceData(true);
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const commandIds = React.useRef<Record<string, string>>({});
  const commandFor = (key: string) => {
    if (!actorId) throw new Error("جلسة لوحة التحكم غير جاهزة لتعديل المرجعيات.");
    const scopedKey = `${actorId}:${key}`;
    const existing = commandIds.current[scopedKey];
    if (existing) return { key: scopedKey, id: existing };
    const id = corrId("workforce-reference");
    commandIds.current[scopedKey] = id;
    return { key: scopedKey, id };
  };
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cityCode, setCityCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [shiftName, setShiftName] = useState("");
  const [shiftStartsAt, setShiftStartsAt] = useState("");
  const [shiftEndsAt, setShiftEndsAt] = useState("");

  const run = async (key: string, action: (commandId: string) => Promise<unknown>) => {
    if (!actorId) {
      setError("جلسة لوحة التحكم غير جاهزة لتعديل المرجعيات.");
      return false;
    }
    const command = commandFor(key);
    setError(null);
    setBusy(true);
    try {
      await action(command.id);
      delete commandIds.current[command.key];
      await reference.reload();
      return true;
    } catch (err) {
      setError(workforceErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggleCity = (city: WorkforceCity) => run(`city:update:${city.code}:${city.active ?? true}`, (commandId) =>
    updateWorkforceCity({ ...city, active: !(city.active ?? true) }, commandId));
  const toggleShift = (shift: WorkforceShift) => run(`shift:update:${shift.code}:${shift.active ?? true}`, (commandId) =>
    updateWorkforceShift({ ...shift, active: !(shift.active ?? true) }, commandId));

  return (
    <SettingsPageFrame
      header={
        <CpPageHeader title="مرجعيات Workforce">
          <CpButton variant="ghost" onClick={props.onBack}>رجوع</CpButton>
        </CpPageHeader>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <CpMutedInline>
          المدن التشغيلية والورديات مرجعيات سيادية. المدن المشتقة من مناطق DSH تُضاف تلقائيًا، ويمكن للإدارة تصحيح مسمياتها أو تعطيلها عند توقف التشغيل.
        </CpMutedInline>
        {error ? <CpStateView kind="error" title={error} /> : null}
        {reference.error ? <CpStateView kind="error" title={reference.error} /> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Text role="bodyStrong">المدن</Text>
          {reference.cities.map((city) => (
            <div key={city.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
              <div>
                <Text role="bodySm">{city.nameAr} ({city.code})</Text>
                <div><CpBadge tone={city.active === false ? "danger" : "success"}>{city.active === false ? "معطلة" : "نشطة"}</CpBadge></div>
              </div>
              <CpButton variant={(city.active ?? true) ? "ghost" : "secondary"} disabled={busy} onClick={() => void toggleCity(city)}>
                {(city.active ?? true) ? "تعطيل" : "تفعيل"}
              </CpButton>
            </div>
          ))}
          <div>
            <Text role="bodySm">كود مدينة جديد</Text>
            <CpTextInput value={cityCode} onChange={setCityCode} placeholder="SAH" aria-label="كود مدينة جديد" />
          </div>
          <div>
            <Text role="bodySm">اسم المدينة بالعربية</Text>
            <CpTextInput value={cityName} onChange={setCityName} placeholder="صنعاء" aria-label="اسم المدينة بالعربية" />
          </div>
          <CpButton
            variant="primary"
            disabled={busy || !cityCode.trim() || !cityName.trim()}
            onClick={() =>
              void run(`city:create:${cityCode.trim().toUpperCase()}:${cityName.trim()}`, (commandId) => createWorkforceCity({ code: cityCode.trim().toUpperCase(), nameAr: cityName.trim(), active: true }, commandId)).then((ok) => {
                if (ok) {
                  setCityCode("");
                  setCityName("");
                }
              })
            }
          >
            إضافة مدينة
          </CpButton>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Text role="bodyStrong">الورديات</Text>
          {reference.shifts.map((shift) => (
            <div key={shift.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
              <div>
                <Text role="bodySm">{shift.nameAr} ({shift.code}){shift.startsAt ? ` ${shift.startsAt}–${shift.endsAt}` : ""}</Text>
                <div><CpBadge tone={shift.active === false ? "danger" : "success"}>{shift.active === false ? "معطلة" : "نشطة"}</CpBadge></div>
              </div>
              <CpButton variant={(shift.active ?? true) ? "ghost" : "secondary"} disabled={busy} onClick={() => void toggleShift(shift)}>
                {(shift.active ?? true) ? "تعطيل" : "تفعيل"}
              </CpButton>
            </div>
          ))}
          <div>
            <Text role="bodySm">كود وردية جديد</Text>
            <CpTextInput value={shiftCode} onChange={setShiftCode} placeholder="night" aria-label="كود وردية جديد" />
          </div>
          <div>
            <Text role="bodySm">اسم الوردية بالعربية</Text>
            <CpTextInput value={shiftName} onChange={setShiftName} placeholder="وردية ليلية" aria-label="اسم الوردية بالعربية" />
          </div>
          <div>
            <Text role="bodySm">وقت البداية</Text>
            <CpTextInput value={shiftStartsAt} onChange={setShiftStartsAt} placeholder="16:00" aria-label="وقت البداية" />
          </div>
          <div>
            <Text role="bodySm">وقت النهاية</Text>
            <CpTextInput value={shiftEndsAt} onChange={setShiftEndsAt} placeholder="23:59" aria-label="وقت النهاية" />
          </div>
          <CpButton
            variant="primary"
            disabled={busy || !shiftCode.trim() || !shiftName.trim()}
            onClick={() =>
              void run(`shift:create:${shiftCode.trim()}:${shiftName.trim()}:${shiftStartsAt.trim()}:${shiftEndsAt.trim()}`, (commandId) => createWorkforceShift({
                code: shiftCode.trim(),
                nameAr: shiftName.trim(),
                ...(shiftStartsAt.trim() ? { startsAt: shiftStartsAt.trim() } : {}),
                ...(shiftEndsAt.trim() ? { endsAt: shiftEndsAt.trim() } : {}),
                active: true }, commandId)).then((ok) => {
                if (ok) {
                  setShiftCode("");
                  setShiftName("");
                  setShiftStartsAt("");
                  setShiftEndsAt("");
                }
              })
            }
          >
            إضافة وردية
          </CpButton>
        </div>
      </div>
    </SettingsPageFrame>
  );
}

export default WorkforceReferenceView;

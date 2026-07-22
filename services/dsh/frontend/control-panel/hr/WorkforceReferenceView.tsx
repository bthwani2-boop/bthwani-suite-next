"use client";

import React, { useState } from "react";
import { Box, Button, Card, ScrollScreen, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  createWorkforceCity,
  createWorkforceShift,
  updateWorkforceCity,
  updateWorkforceShift,
  useWorkforceReferenceData,
  workforceErrorMessage,
} from "../../shared/workforce";
import type { WorkforceCity, WorkforceShift } from "../../shared/workforce";

export function WorkforceReferenceView(props: { readonly onBack: () => void }) {
  const reference = useWorkforceReferenceData(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cityCode, setCityCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [shiftName, setShiftName] = useState("");
  const [shiftStartsAt, setShiftStartsAt] = useState("");
  const [shiftEndsAt, setShiftEndsAt] = useState("");

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      await reference.reload();
      return true;
    } catch (err) {
      setError(workforceErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggleCity = (city: WorkforceCity) => run(() => updateWorkforceCity({ ...city, active: !(city.active ?? true) }));
  const toggleShift = (shift: WorkforceShift) => run(() => updateWorkforceShift({ ...shift, active: !(shift.active ?? true) }));

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>مرجعيات Workforce</Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          المدن التشغيلية والورديات مرجعيات سيادية. المدن المشتقة من مناطق DSH تُضاف تلقائيًا، ويمكن للإدارة تصحيح مسمياتها أو تعطيلها عند توقف التشغيل.
        </Text>
        {error ? <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{error}</Text> : null}
        {reference.error ? <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{reference.error}</Text> : null}
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="bodyStrong" style={{ textAlign: "right" }}>المدن</Text>
        {reference.cities.map((city) => (
          <Box key={city.code} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] }}>
            <Box style={{ alignItems: "flex-end" }}>
              <Text role="bodySm">{city.nameAr} ({city.code})</Text>
              <Text role="caption" tone={city.active === false ? "danger" : "success"}>{city.active === false ? "معطلة" : "نشطة"}</Text>
            </Box>
            <Button
              label={(city.active ?? true) ? "تعطيل" : "تفعيل"}
              tone={(city.active ?? true) ? "ghost" : "secondary"}
              disabled={busy}
              onPress={() => void toggleCity(city)}
            />
          </Box>
        ))}
        <TextField label="كود مدينة جديد" value={cityCode} onChangeText={setCityCode} placeholder="SAH" />
        <TextField label="اسم المدينة بالعربية" value={cityName} onChangeText={setCityName} placeholder="صنعاء" />
        <Button
          label="إضافة مدينة"
          tone="primary"
          disabled={busy || !cityCode.trim() || !cityName.trim()}
          onPress={() =>
            void run(() => createWorkforceCity({ code: cityCode.trim().toUpperCase(), nameAr: cityName.trim(), active: true })).then((ok) => {
              if (ok) {
                setCityCode("");
                setCityName("");
              }
            })
          }
        />
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="bodyStrong" style={{ textAlign: "right" }}>الورديات</Text>
        {reference.shifts.map((shift) => (
          <Box key={shift.code} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] }}>
            <Box style={{ alignItems: "flex-end" }}>
              <Text role="bodySm">{shift.nameAr} ({shift.code}){shift.startsAt ? ` ${shift.startsAt}–${shift.endsAt}` : ""}</Text>
              <Text role="caption" tone={shift.active === false ? "danger" : "success"}>{shift.active === false ? "معطلة" : "نشطة"}</Text>
            </Box>
            <Button
              label={(shift.active ?? true) ? "تعطيل" : "تفعيل"}
              tone={(shift.active ?? true) ? "ghost" : "secondary"}
              disabled={busy}
              onPress={() => void toggleShift(shift)}
            />
          </Box>
        ))}
        <TextField label="كود وردية جديد" value={shiftCode} onChangeText={setShiftCode} placeholder="night" />
        <TextField label="اسم الوردية بالعربية" value={shiftName} onChangeText={setShiftName} placeholder="وردية ليلية" />
        <TextField label="وقت البداية" value={shiftStartsAt} onChangeText={setShiftStartsAt} placeholder="16:00" />
        <TextField label="وقت النهاية" value={shiftEndsAt} onChangeText={setShiftEndsAt} placeholder="23:59" />
        <Button
          label="إضافة وردية"
          tone="primary"
          disabled={busy || !shiftCode.trim() || !shiftName.trim()}
          onPress={() =>
            void run(() => createWorkforceShift({
              code: shiftCode.trim(),
              nameAr: shiftName.trim(),
              ...(shiftStartsAt.trim() ? { startsAt: shiftStartsAt.trim() } : {}),
              ...(shiftEndsAt.trim() ? { endsAt: shiftEndsAt.trim() } : {}),
              active: true,
            })).then((ok) => {
              if (ok) {
                setShiftCode("");
                setShiftName("");
                setShiftStartsAt("");
                setShiftEndsAt("");
              }
            })
          }
        />
      </Card>
    </ScrollScreen>
  );
}

export default WorkforceReferenceView;

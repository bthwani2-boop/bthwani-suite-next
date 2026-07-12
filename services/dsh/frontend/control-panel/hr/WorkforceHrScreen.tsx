"use client";

// Grammar contract reference — required by control-panel grammar guard.
// density: standard (operational data). hero: forbidden. state: live (Workforce API).
import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  ScrollScreen,
  Surface,
  Text,
  TextField,
  colorRoles,
  radius,
  spacing,
  statusScale,
} from "@bthwani/ui-kit";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  ENGAGEMENT_TYPE_LABEL_AR,
  useFieldAgentCreateController,
  useFieldAgentDetailController,
  useFieldAgentListController,
  useWorkforceReferenceData,
  createWorkforceCity,
  createWorkforceShift,
  updateWorkforceCity,
  updateWorkforceShift,
  workforceErrorMessage,
} from "../../shared/workforce";
import type {
  EngagementStatus,
  FieldAgent,
  WorkforceCity,
  WorkforceShift,
} from "../../shared/workforce";

type HrView =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; actorId: string }
  | { kind: "reference" };

const STATUS_TABS: Array<{ label: string; value: EngagementStatus | undefined }> = [
  { label: "الكل", value: undefined },
  { label: "جاهز للتفعيل", value: "pending_activation" },
  { label: "مفعل", value: "active" },
  { label: "موقوف", value: "suspended" },
];

function statusTone(status: EngagementStatus): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "pending_activation":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "muted";
  }
}

export function WorkforceHrScreen() {
  const [view, setView] = useState<HrView>({ kind: "list" });

  if (view.kind === "create") {
    return <FieldAgentCreateView onBack={() => setView({ kind: "list" })} onCreated={(agent) => setView({ kind: "detail", actorId: agent.actorId })} />;
  }
  if (view.kind === "detail") {
    return <FieldAgentDetailView actorId={view.actorId} onBack={() => setView({ kind: "list" })} />;
  }
  if (view.kind === "reference") {
    return <WorkforceReferenceView onBack={() => setView({ kind: "list" })} />;
  }
  return (
    <FieldAgentListView
      onCreate={() => setView({ kind: "create" })}
      onOpen={(actorId) => setView({ kind: "detail", actorId })}
      onReference={() => setView({ kind: "reference" })}
    />
  );
}

// ---- list ----

function FieldAgentListView(props: {
  onCreate: () => void;
  onOpen: (actorId: string) => void;
  onReference: () => void;
}) {
  const { state, status, setStatus, query, setQuery, reload } = useFieldAgentListController();
  const reference = useWorkforceReferenceData();

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            مقدمو الخدمة الميدانيون
          </Text>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2] }}>
            <Button label="إضافة مقدم خدمة" tone="primary" onPress={props.onCreate} />
            <Button label="المرجعيات" tone="ghost" onPress={props.onReference} />
          </Box>
        </Box>

        <TextField
          label="بحث بالاسم أو رقم المزود"
          value={query}
          onChangeText={setQuery}
          placeholder="مثال: WF-102 أو أحمد"
        />

        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.label}
              label={tab.label}
              tone={status === tab.value ? "primary" : "ghost"}
              onPress={() => setStatus(tab.value)}
            />
          ))}
        </Box>
      </Card>

      {state.kind === "loading" && (
        <Surface tone="default" padding={4}>
          <Text role="bodySm" tone="muted" align="center">جارٍ تحميل مقدمي الخدمة…</Text>
        </Surface>
      )}
      {state.kind === "error" && (
        <Surface tone="warning" padding={4}>
          <Text role="bodySm" tone="danger" align="center">{state.message}</Text>
          <Box style={{ alignItems: "center", marginTop: spacing[2] }}>
            <Button label="إعادة المحاولة" tone="secondary" onPress={() => void reload()} />
          </Box>
        </Surface>
      )}
      {state.kind === "ready" && state.fieldAgents.length === 0 && (
        <Surface tone="default" padding={4}>
          <Text role="bodySm" tone="muted" align="center">
            لا يوجد مقدمو خدمة مطابقون — أضف مقدم خدمة جديدًا للبدء.
          </Text>
        </Surface>
      )}
      {state.kind === "ready" &&
        state.fieldAgents.map((agent) => (
          <Card key={agent.actorId} style={{ padding: spacing[3], gap: spacing[1] }}>
            <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
              <Box style={{ alignItems: "flex-end", gap: 2 }}>
                <Text role="bodyStrong">{agent.fullNameAr}</Text>
                <Text role="caption" tone="muted">
                  {agent.providerCode} · {reference.cityLabel(agent.fieldProfile?.cityCode)} · {reference.shiftLabel(agent.fieldProfile?.shiftCode)}
                </Text>
              </Box>
              <Box style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
                <Text role="bodySm" tone={statusTone(agent.engagementStatus)}>
                  {ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]}
                </Text>
                <Button label="فتح" tone="secondary" onPress={() => props.onOpen(agent.actorId)} />
              </Box>
            </Box>
          </Card>
        ))}
    </ScrollScreen>
  );
}

// ---- create ----

function FieldAgentCreateView(props: { onBack: () => void; onCreated: (agent: FieldAgent) => void }) {
  const { state, submit } = useFieldAgentCreateController();
  const reference = useWorkforceReferenceData();
  const [fullNameAr, setFullNameAr] = useState("");
  const [fullNameEn, setFullNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [supervisorActorId, setSupervisorActorId] = useState("");

  const canSubmit =
    fullNameAr.trim().length > 0 &&
    phone.trim().length >= 9 &&
    /^[A-Za-z0-9_-]{2,32}$/.test(providerCode.trim()) &&
    state.kind !== "submitting";

  const handleSubmit = async () => {
    const agent = await submit({
      fullNameAr: fullNameAr.trim(),
      fullNameEn: fullNameEn.trim() || undefined,
      phoneE164: phone.trim(),
      providerCode: providerCode.trim(),
      engagementType: "independent_contractor",
      engagementStartDate: startDate.trim() || undefined,
      cityCode: cityCode || undefined,
      shiftCode: shiftCode || undefined,
      supervisorActorId: supervisorActorId.trim() || undefined,
    });
    if (agent) props.onCreated(agent);
  };

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            إضافة مقدم خدمة ميداني
          </Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          مقدم خدمة مستقل — يتقاضى عمولة عن كل انضمام متجر. البيانات السيادية تُدار هنا فقط،
          ورقم الهاتف يُسجَّل في خدمة الهوية ولا يُخزَّن في Workforce.
        </Text>

        <TextField label="الاسم الكامل (عربي) *" value={fullNameAr} onChangeText={setFullNameAr} placeholder="أحمد محمد" />
        <TextField label="الاسم الكامل (إنجليزي)" value={fullNameEn} onChangeText={setFullNameEn} placeholder="Ahmed Mohammed" />
        <TextField label="رقم الهاتف *" value={phone} onChangeText={setPhone} placeholder="مثال: 777123456" />
        <TextField label="رقم المزود *" value={providerCode} onChangeText={setProviderCode} placeholder="مثال: WF-102" />
        <TextField label="تاريخ بداية الارتباط (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-07-12" />
        <TextField label="معرف المشرف (actor id)" value={supervisorActorId} onChangeText={setSupervisorActorId} placeholder="operator-…" />

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>المدينة</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {reference.cities.map((city) => (
            <Button
              key={city.code}
              label={city.nameAr}
              tone={cityCode === city.code ? "primary" : "ghost"}
              onPress={() => setCityCode(city.code === cityCode ? "" : city.code)}
            />
          ))}
        </Box>

        <Text role="bodySm" style={{ textAlign: "right", fontWeight: "bold" }}>الوردية</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {reference.shifts.map((shift) => (
            <Button
              key={shift.code}
              label={shift.nameAr}
              tone={shiftCode === shift.code ? "primary" : "ghost"}
              onPress={() => setShiftCode(shift.code === shiftCode ? "" : shift.code)}
            />
          ))}
        </Box>

        {state.kind === "error" && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{state.message}</Text>
        )}

        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], marginTop: spacing[2] }}>
          <Button
            label="إنشاء الملف"
            tone="primary"
            disabled={!canSubmit}
            loading={state.kind === "submitting"}
            onPress={() => void handleSubmit()}
          />
        </Box>
      </Card>
    </ScrollScreen>
  );
}

// ---- detail ----

function FieldAgentDetailView(props: { actorId: string; onBack: () => void }) {
  const controller = useFieldAgentDetailController(props.actorId);
  const reference = useWorkforceReferenceData();
  const [reason, setReason] = useState("");

  if (controller.state.kind === "loading") {
    return (
      <ScrollScreen>
        <Surface tone="default" padding={4}>
          <Text role="bodySm" tone="muted" align="center">جارٍ تحميل الملف…</Text>
        </Surface>
      </ScrollScreen>
    );
  }
  if (controller.state.kind === "error") {
    return (
      <ScrollScreen>
        <Surface tone="warning" padding={4}>
          <Text role="bodySm" tone="danger" align="center">{controller.state.message}</Text>
          <Box style={{ alignItems: "center", marginTop: spacing[2], flexDirection: "row-reverse", gap: spacing[2], justifyContent: "center" }}>
            <Button label="إعادة المحاولة" tone="secondary" onPress={() => void controller.reload()} />
            <Button label="رجوع" tone="ghost" onPress={props.onBack} />
          </Box>
        </Surface>
      </ScrollScreen>
    );
  }

  const agent = controller.state.agent;
  const rows: Array<[string, string]> = [
    ["الاسم", agent.fullNameAr],
    ["رقم المزود", agent.providerCode],
    ["الهاتف", agent.phoneMasked ?? "—"],
    ["نوع الارتباط", ENGAGEMENT_TYPE_LABEL_AR[agent.engagementType]],
    ["تاريخ البداية", agent.engagementStartDate || "—"],
    ["المدينة", reference.cityLabel(agent.fieldProfile?.cityCode)],
    ["الوردية", reference.shiftLabel(agent.fieldProfile?.shiftCode)],
    ["المشرف", agent.fieldProfile?.supervisorActorId || "—"],
    ["حالة الارتباط", ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]],
    ["حساب الهوية", agent.authActive ? "مفعل للمصادقة" : "غير مفعل"],
  ];

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>ملف مقدم الخدمة</Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        {rows.map(([label, value]) => (
          <Box key={label} style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
            <Text role="bodySm" tone="muted">{label}</Text>
            <Text role="bodyStrong">{value}</Text>
          </Box>
        ))}
      </Card>

      {controller.issuedCode && (
        <Card style={{ padding: spacing[4], gap: spacing[2], backgroundColor: statusScale.infoSoft, borderColor: statusScale.info, borderWidth: 1 }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold", color: statusScale.infoStrong }}>
            ✓ كود التفعيل — يُعرض مرة واحدة فقط
          </Text>
          <Box
            style={{
              padding: spacing[4],
              backgroundColor: colorRoles.surfaceBase,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colorRoles.borderStrong,
              alignItems: "center",
            }}
          >
            <Text role="titleLg" style={{ fontFamily: "monospace", letterSpacing: 2, fontWeight: "bold" }}>
              {controller.issuedCode.code}
            </Text>
          </Box>
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
            للهاتف {controller.issuedCode.maskedPhone} — تنتهي الصلاحية{" "}
            {new Date(controller.issuedCode.expiresAt).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </Card>
      )}

      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>إجراءات التفعيل والحالة</Text>
        {!agent.readyToIssue && agent.engagementStatus === "pending_activation" && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>
            الملف السيادي ناقص (الاسم/الرقم/المدينة/الوردية) — أكمله قبل إصدار الكود.
          </Text>
        )}
        {controller.actionError && (
          <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{controller.actionError}</Text>
        )}
        <TextField label="سبب الإيقاف / إعادة التفعيل" value={reason} onChangeText={setReason} placeholder="اختياري للإصدار، مطلوب للإيقاف" />
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {(agent.engagementStatus === "pending_activation" || agent.engagementStatus === "active") && (
            <Button
              label="إصدار كود تفعيل"
              tone="primary"
              disabled={controller.actionBusy || (agent.engagementStatus === "pending_activation" && !agent.readyToIssue)}
              loading={controller.actionBusy}
              onPress={() => void controller.issueCode(agent.version)}
            />
          )}
          <Button
            label="إبطال الأكواد المعلقة"
            tone="ghost"
            disabled={controller.actionBusy}
            onPress={() => void controller.revokeCodes()}
          />
          {agent.engagementStatus !== "suspended" && agent.engagementStatus !== "terminated" && (
            <Button
              label="إيقاف"
              tone="danger"
              disabled={controller.actionBusy || reason.trim().length === 0}
              onPress={() => void controller.suspend(agent.version, reason.trim())}
            />
          )}
          {agent.engagementStatus === "suspended" && (
            <Button
              label="إعادة تفعيل"
              tone="secondary"
              disabled={controller.actionBusy}
              onPress={() => void controller.reactivate(agent.version, reason.trim())}
            />
          )}
        </Box>
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          الإيقاف يبطل كل الجلسات وأكواد التفعيل فورًا عبر خدمة الهوية. إسناد المتاجر والمناطق
          يتم من قسم الشركاء والمتاجر (DSH) بمعرف الحساب نفسه: {agent.actorId}
        </Text>
      </Card>
    </ScrollScreen>
  );
}

// ---- reference data management ----

function WorkforceReferenceView(props: { onBack: () => void }) {
  const reference = useWorkforceReferenceData(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cityCode, setCityCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [shiftName, setShiftName] = useState("");

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

  const toggleCity = (city: WorkforceCity) =>
    run(() => updateWorkforceCity({ ...city, active: !(city.active ?? true) }));
  const toggleShift = (shift: WorkforceShift) =>
    run(() => updateWorkforceShift({ ...shift, active: !(shift.active ?? true) }));

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>مرجعيات Workforce — المدن والورديات</Text>
          <Button label="رجوع" tone="ghost" onPress={props.onBack} />
        </Box>
        {error && <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{error}</Text>}
        {reference.error && <Text role="bodySm" tone="danger" style={{ textAlign: "right" }}>{reference.error}</Text>}
      </Card>

      <Card style={{ padding: spacing[4], gap: spacing[2] }}>
        <Text role="bodyStrong" style={{ textAlign: "right" }}>المدن</Text>
        {reference.cities.map((city) => (
          <Box key={city.code} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text role="bodySm">{city.nameAr} ({city.code})</Text>
            <Button
              label={(city.active ?? true) ? "تعطيل" : "تفعيل"}
              tone={(city.active ?? true) ? "ghost" : "secondary"}
              disabled={busy}
              onPress={() => void toggleCity(city)}
            />
          </Box>
        ))}
        <TextField label="كود مدينة جديد" value={cityCode} onChangeText={setCityCode} placeholder="mukalla" />
        <TextField label="اسم المدينة (عربي)" value={cityName} onChangeText={setCityName} placeholder="المكلا" />
        <Button
          label="إضافة مدينة"
          tone="primary"
          disabled={busy || !cityCode.trim() || !cityName.trim()}
          onPress={() =>
            void run(() => createWorkforceCity({ code: cityCode.trim(), nameAr: cityName.trim() })).then((ok) => {
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
          <Box key={shift.code} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text role="bodySm">
              {shift.nameAr} ({shift.code}){shift.startsAt ? ` ${shift.startsAt}–${shift.endsAt}` : ""}
            </Text>
            <Button
              label={(shift.active ?? true) ? "تعطيل" : "تفعيل"}
              tone={(shift.active ?? true) ? "ghost" : "secondary"}
              disabled={busy}
              onPress={() => void toggleShift(shift)}
            />
          </Box>
        ))}
        <TextField label="كود وردية جديد" value={shiftCode} onChangeText={setShiftCode} placeholder="night" />
        <TextField label="اسم الوردية (عربي)" value={shiftName} onChangeText={setShiftName} placeholder="وردية ليلية" />
        <Button
          label="إضافة وردية"
          tone="primary"
          disabled={busy || !shiftCode.trim() || !shiftName.trim()}
          onPress={() =>
            void run(() => createWorkforceShift({ code: shiftCode.trim(), nameAr: shiftName.trim() })).then((ok) => {
              if (ok) {
                setShiftCode("");
                setShiftName("");
              }
            })
          }
        />
      </Card>
    </ScrollScreen>
  );
}

export default WorkforceHrScreen;

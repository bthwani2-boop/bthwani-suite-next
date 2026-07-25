"use client";

import { useState } from "react";
import { Card, Text } from "@bthwani/ui-kit";
import {
  CpBadge,
  CpButton,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTabs,
  CpTextInput,
} from "@bthwani/control-panel/components";

// 1. Client Profile Workspace (Customer360)
export function ClientProfileWorkspace() {
  const [clientId, setClientId] = useState("");
  const [profile, setProfile] = useState<any | null>(null);

  const handleSearch = () => {
    if (!clientId.trim()) return;
    setProfile({
      id: clientId,
      name: "محمد الشمري",
      phone: "+966 50 123 4567",
      email: "m.shammari@example.com",
      registrationDate: "2025-01-10",
      orderCount: 42,
      status: "نشط",
      notes: "عميل مميز (VIP) - لا توجد نزاعات معلقة",
    });
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <Text role="titleMd">ملف العميل الشامل (Customer 360)</Text>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <CpTextInput value={clientId} onChange={setClientId} placeholder="أدخل معرف العميل أو رقم الهاتف..." aria-label="البحث عن عميل" />
        <CpButton onClick={handleSearch}>بحث عن العميل</CpButton>
      </div>

      {profile ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
          <Card style={{ padding: "1rem" }}>
            <Text role="titleSm" style={{ marginBottom: "0.75rem" }}>البيانات الأساسية</Text>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
              <div>الاسم: <strong>{profile.name}</strong></div>
              <div>الهاتف: <strong>{profile.phone}</strong></div>
              <div>البريد الإلكتروني: <strong>{profile.email}</strong></div>
              <div>تاريخ التسجيل: <strong>{profile.registrationDate}</strong></div>
            </div>
          </Card>

          <Card style={{ padding: "1rem" }}>
            <Text role="titleSm" style={{ marginBottom: "0.75rem" }}>النشاط والتقييم</Text>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
              <div>عدد الطلبات المكتملة: <strong>{profile.orderCount} طلب</strong></div>
              <div>حالة الحساب: <CpBadge tone="success">{profile.status}</CpBadge></div>
              <div>ملاحظات الدعم: <Text role="bodySm" tone="muted">{profile.notes}</Text></div>
            </div>
          </Card>
        </div>
      ) : (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <Text role="body" tone="muted">يرجى إدخال معرف العميل لبدء عرض البيانات الشاملة.</Text>
        </Card>
      )}
    </div>
  );
}

// 2. Call Reception Workspace (Manual Call Intake)
export function CallReceptionWorkspace() {
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);

  const handleRegisterCall = () => {
    if (!callerName || !callerPhone || !callNotes) return;
    setTickets([...tickets, { id: `call-${Date.now()}`, name: callerName, phone: callerPhone, notes: callNotes, status: "مفتوحة" }]);
    setCallerName("");
    setCallerPhone("");
    setCallNotes("");
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <Text role="titleMd">مركز استقبال وتسجيل المكالمات اليدوية</Text>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <Card style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Text role="titleSm">تسجيل تذكرة اتصال واردة</Text>
          <CpTextInput value={callerName} onChange={setCallerName} placeholder="اسم المتصل" aria-label="اسم المتصل" />
          <CpTextInput value={callerPhone} onChange={setCallerPhone} placeholder="رقم الهاتف" aria-label="رقم الهاتف" />
          <CpTextInput value={callNotes} onChange={setCallNotes} placeholder="ملاحظات وتفاصيل المكالمة..." aria-label="تفاصيل المكالمة" />
          <CpButton onClick={handleRegisterCall} disabled={!callerName || !callerPhone || !callNotes}>تسجيل وتوجيه التذكرة</CpButton>
        </Card>

        <div>
          <Text role="titleSm" style={{ marginBottom: "0.5rem" }}>المكالمات المسجلة حديثاً</Text>
          {tickets.length === 0 ? (
            <Card style={{ padding: "2rem", textAlign: "center" }}>
              <Text role="bodySm" tone="muted">لا توجد اتصالات مسجلة في هذه الجلسة.</Text>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {tickets.map(t => (
                <Card key={t.id} style={{ padding: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{t.name} ({t.phone})</strong>
                    <CpBadge tone="info">{t.status}</CpBadge>
                  </div>
                  <Text role="bodySm" tone="muted" style={{ marginTop: "0.25rem" }}>{t.notes}</Text>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. Compliance & Risk Workspace
export function ComplianceRiskWorkspace() {
  const incidents = [
    { id: "inc-101", partner: "كابتن خالد الحربي", issue: "تأخر متكرر في استلام الطلبات", riskScore: "مرتفع", status: "تحت المراقبة" },
    { id: "inc-102", partner: "متجر الفاخر", issue: "إلغاء طلبات متكرر في أوقات الذروة", riskScore: "متوسط", status: "مراجعة السياسات" },
  ];

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <Text role="titleMd">مركز حوكمة الالتزام وإدارة المخاطر التشغيلية</Text>
      <Text role="bodySm" tone="muted">مراقبة الحوادث المتكررة، وسلوكيات الشركاء والكباتن لضمان جودة المنظومة:</Text>

      <CpTable aria-label="حوادث الالتزام والمخاطر">
        <thead>
          <tr>
            <CpTableHeaderCell>الطرف المعني</CpTableHeaderCell>
            <CpTableHeaderCell>المشكلة المكتشفة</CpTableHeaderCell>
            <CpTableHeaderCell>مستوى الخطورة</CpTableHeaderCell>
            <CpTableHeaderCell>الحالة</CpTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {incidents.map(inc => (
            <tr key={inc.id}>
              <CpTableCell>{inc.partner}</CpTableCell>
              <CpTableCell>{inc.issue}</CpTableCell>
              <CpTableCell>
                <CpBadge tone={inc.riskScore === "مرتفع" ? "danger" : "warning"}>{inc.riskScore}</CpBadge>
              </CpTableCell>
              <CpTableCell>{inc.status}</CpTableCell>
            </tr>
          ))}
        </tbody>
      </CpTable>
    </div>
  );
}

// 4. Messages Workspace (OpsClientMessaging / OpsPartnerMessaging / OpsCaptainMessaging)
const MESSAGE_SUB_TABS = [
  { value: "client", label: "دردشة العميل" },
  { value: "partner", label: "دردشة الشريك" },
  { value: "captain", label: "دردشة الكابتن" },
] as const;

export function MessagesWorkspace() {
  const [activeSubTab, setActiveSubTab] = useState<"client" | "partner" | "captain">("client");
  const [chatLog, setChatLog] = useState<any[]>([
    { id: "msg-1", sender: "محمد الشمري (العميل)", text: "مرحباً، الطلب تأخر كثيراً ولم يصلني بعد.", timestamp: "10:15" },
    { id: "msg-2", sender: "دعم العمليات", text: "أهلاً بك محمد، جارٍ التحقق من كابتن التوصيل والرد عليك فوراً.", timestamp: "10:17" },
  ]);
  const [msgText, setMsgText] = useState("");

  const handleSend = () => {
    if (!msgText.trim()) return;
    setChatLog([...chatLog, { id: `msg-${Date.now()}`, sender: "دعم العمليات", text: msgText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setMsgText("");
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <Text role="titleMd">بوابة المحادثات المباشرة وغرف العمليات</Text>

      <CpTabs
        items={MESSAGE_SUB_TABS}
        value={activeSubTab}
        onChange={(value) => setActiveSubTab(value as "client" | "partner" | "captain")}
        aria-label="نوع المحادثة"
      />

      <Card style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", padding: "1rem", minHeight: "18rem", maxHeight: "25rem", overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {chatLog.map(msg => (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignSelf: msg.sender === "دعم العمليات" ? "flex-end" : "flex-start", maxWidth: "70%" }}>
              <Card style={{ padding: "0.5rem 0.75rem" }}>
                <Text role="caption" style={{ fontWeight: 700 }}>{msg.sender}</Text>
                <div style={{ fontSize: "13px", marginTop: "0.25rem" }}>{msg.text}</div>
                <Text role="caption" tone="muted" style={{ alignSelf: "flex-end", marginTop: "0.25rem" }}>{msg.timestamp}</Text>
              </Card>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <CpTextInput value={msgText} onChange={setMsgText} placeholder="أدخل نص الرسالة..." aria-label="محتوى الرسالة" />
        <CpButton onClick={handleSend} disabled={!msgText.trim()}>إرسال</CpButton>
      </div>
    </div>
  );
}

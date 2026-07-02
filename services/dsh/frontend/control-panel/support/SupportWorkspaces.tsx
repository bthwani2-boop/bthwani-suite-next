"use client";

import React, { useState } from "react";
import { opsTheme } from "../../shared/operations";
import { CpButton, CpTextInput, CpTable, CpTableCell, CpTableHeaderCell } from "@bthwani/control-panel/components";

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
      <h3 style={{ margin: 0, color: opsTheme.brand }}>ملف العميل الشامل (Customer 360)</h3>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <CpTextInput value={clientId} onChange={setClientId} placeholder="أدخل معرف العميل أو رقم الهاتف..." aria-label="البحث عن عميل" />
        <CpButton onClick={handleSearch}>بحث عن العميل</CpButton>
      </div>

      {profile ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
          <div style={{ padding: "1rem", border: `1px solid ${opsTheme.line}`, borderRadius: "0.5rem", background: "white" }}>
            <h4 style={{ margin: "0 0 0.75rem" }}>البيانات الأساسية</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
              <div>الاسم: <strong>{profile.name}</strong></div>
              <div>الهاتف: <strong>{profile.phone}</strong></div>
              <div>البريد الإلكتروني: <strong>{profile.email}</strong></div>
              <div>تاريخ التسجيل: <strong>{profile.registrationDate}</strong></div>
            </div>
          </div>

          <div style={{ padding: "1rem", border: `1px solid ${opsTheme.line}`, borderRadius: "0.5rem", background: "white" }}>
            <h4 style={{ margin: "0 0 0.75rem" }}>النشاط والتقييم</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem" }}>
              <div>عدد الطلبات المكتملة: <strong>{profile.orderCount} طلب</strong></div>
              <div>حالة الحساب: <strong style={{ color: opsTheme.success }}>{profile.status}</strong></div>
              <div>ملاحظات الدعم: <span style={{ color: opsTheme.textMuted }}>{profile.notes}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "3rem", textAlign: "center", border: `2px dashed ${opsTheme.line}`, borderRadius: "0.5rem", color: opsTheme.textMuted }}>
          يرجى إدخال معرف العميل لبدء عرض البيانات الشاملة.
        </div>
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
      <h3 style={{ margin: 0, color: opsTheme.brand }}>مركز استقبال وتسجيل المكالمات اليدوية</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ background: opsTheme.surfaceInset, padding: "1rem", borderRadius: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h4 style={{ margin: "0 0 0.5rem" }}>تسجيل تذكرة اتصال واردة</h4>
          <CpTextInput value={callerName} onChange={setCallerName} placeholder="اسم المتصل" aria-label="اسم المتصل" />
          <CpTextInput value={callerPhone} onChange={setCallerPhone} placeholder="رقم الهاتف" aria-label="رقم الهاتف" />
          <CpTextInput value={callNotes} onChange={setCallNotes} placeholder="ملاحظات وتفاصيل المكالمة..." aria-label="تفاصيل المكالمة" />
          <CpButton onClick={handleRegisterCall} disabled={!callerName || !callerPhone || !callNotes}>تسجيل وتوجيه التذكرة</CpButton>
        </div>

        <div>
          <h4 style={{ margin: "0 0 0.5rem" }}>المكالمات المسجلة حديثاً</h4>
          {tickets.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", border: `1px dashed ${opsTheme.line}`, borderRadius: "0.5rem", color: opsTheme.textMuted, fontSize: "0.8rem" }}>
              لا توجد اتصالات مسجلة في هذه الجلسة.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {tickets.map(t => (
                <div key={t.id} style={{ padding: "0.75rem", border: `1px solid ${opsTheme.line}`, borderRadius: "0.5rem", background: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{t.name} ({t.phone})</strong>
                    <span style={{ color: opsTheme.brand, fontSize: "0.8rem" }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: opsTheme.textMuted, marginTop: "0.25rem" }}>{t.notes}</div>
                </div>
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
      <h3 style={{ margin: 0, color: opsTheme.brand }}>مركز حوكمة الالتزام وإدارة المخاطر التشغيلية</h3>
      <p style={{ margin: 0, fontSize: "0.813rem", color: opsTheme.textMuted }}>مراقبة الحوادث المتكررة، وسلوكيات الشركاء والكباتن لضمان جودة المنظومة:</p>

      <CpTable>
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
                <span style={{ color: inc.riskScore === "مرتفع" ? opsTheme.danger : opsTheme.warning, fontWeight: 700 }}>{inc.riskScore}</span>
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
      <h3 style={{ margin: 0, color: opsTheme.brand }}>بوابة المحادثات المباشرة وغرف العمليات</h3>

      <div style={{ display: "flex", gap: "0.25rem", borderBottom: `1px solid ${opsTheme.line}`, paddingBottom: "0.5rem" }}>
        {(["client", "partner", "captain"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              padding: "6px 12px",
              border: "none",
              borderBottom: activeSubTab === tab ? `2px solid ${opsTheme.brand}` : "2px solid transparent",
              background: "none",
              color: activeSubTab === tab ? opsTheme.brand : opsTheme.textMuted,
              fontWeight: activeSubTab === tab ? 700 : 500,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {tab === "client" ? "دردشة العميل" : tab === "partner" ? "دردشة الشريك" : "دردشة الكابتن"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", background: opsTheme.surfaceInset, padding: "1rem", borderRadius: "0.5rem", minHeight: "18rem", maxHeight: "25rem", overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {chatLog.map(msg => (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignSelf: msg.sender === "دعم العمليات" ? "flex-end" : "flex-start", maxWidth: "70%", background: msg.sender === "دعم العمليات" ? opsTheme.brandSurface : "white", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: `1px solid ${opsTheme.line}` }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: msg.sender === "دعم العمليات" ? opsTheme.brand : opsTheme.text }}>{msg.sender}</div>
              <div style={{ fontSize: "13px", marginTop: "0.25rem" }}>{msg.text}</div>
              <div style={{ fontSize: "9px", color: opsTheme.textMuted, alignSelf: "flex-end", marginTop: "0.25rem" }}>{msg.timestamp}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <CpTextInput value={msgText} onChange={setMsgText} placeholder="أدخل نص الرسالة..." aria-label="محتوى الرسالة" />
        <CpButton onClick={handleSend} disabled={!msgText.trim()}>إرسال</CpButton>
      </div>
    </div>
  );
}

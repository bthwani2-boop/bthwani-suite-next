"use client";
import { colorRoles } from '@bthwani/ui-kit';

import React, { useState } from "react";

import { CpButton, CpTextInput, CpTable, CpTableCell, CpTableHeaderCell } from "@bthwani/control-panel/components";

// 1. Canary / Rollout Flag Workspace
export function DshPlatformCanaryWorkspace() {
  const [flags, setFlags] = useState([
    { id: "flag-001", name: "dsh-new-checkout-flow", scope: "عمليات العميل", percentage: 10, status: "نشط" },
    { id: "flag-002", name: "dsh-partner-loyalty-program", scope: "بوابة الشركاء", percentage: 0, status: "مسودة" },
    { id: "flag-003", name: "wlt-instant-settlement-bridge", scope: "جسر WLT المالي", percentage: 100, status: "مكتمل" },
  ]);

  const handleIncrease = (id: string) => {
    setFlags(flags.map(f => f.id === id ? { ...f, percentage: Math.min(f.percentage + 10, 100), status: f.percentage + 10 >= 100 ? "مكتمل" : "نشط" } : f));
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: colorRoles.brandAction }}>لوحة إدارة الإطلاق التدريجي (Canary Flags)</h3>
      <p style={{ margin: 0, fontSize: "0.813rem", color: colorRoles.brandStructure }}>إدارة وتدرج نسب الإطلاق وتوجيه زيارات المستخدمين للخدمات المحدثة لتقليل المخاطر:</p>

      <CpTable>
        <thead>
          <tr>
            <CpTableHeaderCell>اسم الميزة / العلم</CpTableHeaderCell>
            <CpTableHeaderCell>المجال</CpTableHeaderCell>
            <CpTableHeaderCell>نسبة التوجيه</CpTableHeaderCell>
            <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            <CpTableHeaderCell>العمليات</CpTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {flags.map(flag => (
            <tr key={flag.id}>
              <CpTableCell>{flag.name}</CpTableCell>
              <CpTableCell>{flag.scope}</CpTableCell>
              <CpTableCell>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "5rem", height: "0.5rem", background: colorRoles.surfaceBase, borderRadius: "0.25rem", overflow: "hidden" }}>
                    <div style={{ width: `${flag.percentage}%`, height: "100%", background: colorRoles.brandAction }} />
                  </div>
                  <span>{flag.percentage}%</span>
                </div>
              </CpTableCell>
              <CpTableCell>
                <span style={{ color: flag.status === "مكتمل" ? colorRoles.brandStructure : flag.status === "نشط" ? colorRoles.brandAction : colorRoles.brandStructure }}>{flag.status}</span>
              </CpTableCell>
              <CpTableCell>
                {flag.percentage < 100 && (
                  <CpButton onClick={() => handleIncrease(flag.id)}>زيادة النسبة +10%</CpButton>
                )}
              </CpTableCell>
            </tr>
          ))}
        </tbody>
      </CpTable>
    </div>
  );
}

// 2. Platform Health Workspace
export function DshPlatformHealthWorkspace() {
  const services = [
    { name: "dsh-core-api-server", status: "نشط (صحي)", responseTime: "45ms", cpu: "12%", memory: "512MB" },
    { name: "wlt-financial-bridge-worker", status: "نشط (صحي)", responseTime: "120ms", cpu: "28%", memory: "1.2GB" },
    { name: "partner-portal-gateway", status: "نشط (صحي)", responseTime: "30ms", cpu: "8%", memory: "256MB" },
    { name: "notifications-push-service", status: "نشط (صحي)", responseTime: "15ms", cpu: "4%", memory: "128MB" },
  ];

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: colorRoles.brandAction }}>مركز مراقبة أداء وصحة الخدمات</h3>
      <p style={{ margin: 0, fontSize: "0.813rem", color: colorRoles.brandStructure }}>أداء المعالجة، واستهلاك الذاكرة، وزمن الاستجابة للخدمات السيادية:</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {services.map(srv => (
          <div key={srv.name} style={{ padding: "1rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.5rem", background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <strong>{srv.name}</strong>
              <span style={{ color: colorRoles.brandStructure }}>{srv.status}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", color: colorRoles.brandStructure }}>
              <div>زمن الاستجابة: {srv.responseTime}</div>
              <div>استهلاك المعالج: {srv.cpu}</div>
              <div>استهلاك الذاكرة: {srv.memory}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Rollback & History Workspace
export function DshPlatformRollbackWorkspace() {
  const [history, setHistory] = useState([
    { id: "event-001", action: "تحديث متغير: dsh_checkout_timeout_ms", oldValue: "5000", newValue: "4500", operator: "سامي القحطاني", timestamp: "منذ ساعة واحدة", status: "نشط" },
    { id: "event-002", action: "تفعيل Canary: dsh-new-checkout-flow", oldValue: "0%", newValue: "10%", operator: "خالد الحربي", timestamp: "منذ ساعتين", status: "نشط" },
  ]);
  const [result, setResult] = useState<string | null>(null);

  const handleRollback = (id: string) => {
    setHistory(history.map(h => h.id === id ? { ...h, status: "تم التراجع" } : h));
    setResult("تم التراجع عن التعديل وإعادة القيمة السابقة بنجاح");
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: colorRoles.brandAction }}>سجل التعديلات وإجراءات التراجع السريع (Rollback)</h3>
      {result && <div style={{ padding: "0.75rem", background: colorRoles.surfaceBase, border: `1px solid ${colorRoles.brandStructure}`, color: colorRoles.brandStructure, borderRadius: "0.5rem", fontSize: "0.813rem" }}>{result}</div>}

      <CpTable>
        <thead>
          <tr>
            <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
            <CpTableHeaderCell>القيمة السابقة</CpTableHeaderCell>
            <CpTableHeaderCell>القيمة الجديدة</CpTableHeaderCell>
            <CpTableHeaderCell>المشغل</CpTableHeaderCell>
            <CpTableHeaderCell>الوقت</CpTableHeaderCell>
            <CpTableHeaderCell>العمليات</CpTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {history.map(ev => (
            <tr key={ev.id}>
              <CpTableCell>{ev.action}</CpTableCell>
              <CpTableCell>{ev.oldValue}</CpTableCell>
              <CpTableCell>{ev.newValue}</CpTableCell>
              <CpTableCell>{ev.operator}</CpTableCell>
              <CpTableCell>{ev.timestamp}</CpTableCell>
              <CpTableCell>
                {ev.status !== "تم التراجع" ? (
                  <CpButton onClick={() => handleRollback(ev.id)}>تراجع سريع</CpButton>
                ) : (
                  <span style={{ color: colorRoles.brandStructure }}>تم التراجع</span>
                )}
              </CpTableCell>
            </tr>
          ))}
        </tbody>
      </CpTable>
    </div>
  );
}

// 4. Platform Overview Workspace
export function DshPlatformOverviewWorkspace() {
  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} dir="rtl">
      <h3 style={{ margin: 0, color: colorRoles.brandAction }}>نظرة عامة على البنية السيادية للمنصة</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ padding: "1.25rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.75rem", background: "white" }}>
          <h4 style={{ margin: "0 0 0.5rem" }}>توزيع النشر والطبقات</h4>
          <p style={{ margin: 0, fontSize: "0.813rem", color: colorRoles.brandStructure, lineHeight: 1.6 }}>
            تعمل منصة DSH كحلقة الوصل الكبرى لإدارة عمليات الكباتن، العملاء، والشركاء مع ربط مالي مؤمن بالكامل عبر جسر WLT الاستراتيجي.
          </p>
        </div>

        <div style={{ padding: "1.25rem", border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.75rem", background: "white" }}>
          <h4 style={{ margin: "0 0 0.5rem" }}>تحديثات الاستقرار التشغيلي</h4>
          <p style={{ margin: 0, fontSize: "0.813rem", color: colorRoles.brandStructure, lineHeight: 1.6 }}>
            تم تعزيز تصفير الأخطاء بتضمين حواجز أمان سيادية تمنع حدوث تسريبات في الحسابات المالية أو بوابات الدفع أثناء عمليات التحديث.
          </p>
        </div>
      </div>
    </div>
  );
}

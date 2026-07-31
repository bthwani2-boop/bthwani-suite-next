"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpMutedInline,
  CpPageHeader,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { QueuePageFrame } from "@bthwani/control-panel/shell";
import {
  useRoleDefinitionApprovalController,
  type DshAdministrationSurface,
} from "../../shared/administration";

const AVAILABLE_PERMISSIONS = [
  "administration.read",
  "administration.role.request",
  "administration.role.approve",
  "administration.staff.request",
  "administration.staff.approve",
  "administration.audit.read",
  "administration.diagnostics.read",
  "administration.rollback.request",
  "administration.rollback.approve",
] as const;

const AVAILABLE_SURFACES: readonly DshAdministrationSurface[] = [
  "control-panel",
  "app-client",
  "app-partner",
  "app-captain",
  "app-field",
  "webapp",
  "website",
];

export function RoleDefinitionApprovalQueue() {
  const roleRequests = useRoleDefinitionApprovalController("authenticated", "pending");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [permissions, setPermissions] = useState<readonly string[]>(["administration.read"]);
  const [surfaces, setSurfaces] = useState<readonly DshAdministrationSurface[]>(["control-panel"]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const togglePermission = (permission: string) => {
    setPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
  };

  const toggleSurface = (surface: DshAdministrationSurface) => {
    if (surface === "control-panel") return;
    setSurfaces((current) => current.includes(surface)
      ? current.filter((item) => item !== surface)
      : [...current, surface]);
  };

  const requestRole = async () => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await roleRequests.request({
        name: name.trim(),
        description: description.trim(),
        permissions,
        surfaces,
        reason: reason.trim(),
      });
      setName("");
      setDescription("");
      setReason("");
      setPermissions(["administration.read"]);
      setSurfaces(["control-panel"]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر إنشاء طلب تعريف الدور.");
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (requestId: string, version: number, decision: "approved" | "rejected") => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await roleRequests.review(requestId, decision, version, (reviewNotes[requestId] ?? "").trim());
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر مراجعة تعريف الدور.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <QueuePageFrame
      dir="rtl"
      header={<CpPageHeader title="تعريف الأدوار — Maker / Checker" />}
      stateView={
        roleRequests.state.kind === "loading" ? <CpStateView kind="loading" title="جارٍ تحميل طلبات تعريف الأدوار…" />
          : roleRequests.state.kind === "error" ? <CpStateView kind="error" title={roleRequests.state.message} />
          : undefined
      }
    >
      <section aria-label="طلب تعريف دور جديد">
        <strong>طلب تعريف دور جديد</strong>
        <CpTextInput
          value={name}
          onChange={setName}
          placeholder="اسم تقني مثل support-supervisor"
          aria-label="اسم الدور"
        />
        <CpTextInput
          value={description}
          onChange={setDescription}
          placeholder="وصف مسؤوليات الدور"
          aria-label="وصف الدور"
        />
        <CpTextInput
          value={reason}
          onChange={setReason}
          placeholder="سبب إنشاء الدور"
          aria-label="سبب إنشاء الدور"
        />
        <strong>صلاحيات العمليات</strong>
        <div role="group" aria-label="صلاحيات الدور">
          {AVAILABLE_PERMISSIONS.map((permission) => (
            <CpButton
              key={permission}
              variant={permissions.includes(permission) ? "brand" : "secondary"}
              onClick={() => togglePermission(permission)}
              aria-pressed={permissions.includes(permission)}
            >
              {permission}
            </CpButton>
          ))}
        </div>
        <strong>الأسطح المتأثرة</strong>
        <div role="group" aria-label="أسطح الدور">
          {AVAILABLE_SURFACES.map((surface) => (
            <CpButton
              key={surface}
              variant={surfaces.includes(surface) ? "brand" : "secondary"}
              onClick={() => toggleSurface(surface)}
              aria-pressed={surfaces.includes(surface)}
              disabled={surface === "control-panel"}
            >
              {surface}
            </CpButton>
          ))}
        </div>
        <CpStatePanel
          role="status"
          title="لوحة التحكم سطح إلزامي"
          description="تحديد التطبيقات الأخرى يوثق أثر الدور، ولا يمنح مسار إدارة داخل تلك التطبيقات."
        />
        <CpButton
          variant="primary"
          disabled={submitting || name.trim().length < 3 || reason.trim().length < 5 || permissions.length === 0}
          onClick={() => void requestRole()}
        >
          إرسال تعريف الدور للمراجعة
        </CpButton>
      </section>

      {actionError ? <CpStateView kind="error" title={actionError} /> : null}

      {roleRequests.state.kind === "success" && roleRequests.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد طلبات تعريف أدوار معلقة." />
      ) : null}

      {roleRequests.state.kind === "success" && roleRequests.state.data.length > 0 ? (
        <CpTable aria-label="طلبات تعريف الأدوار المعلقة">
          <thead>
            <tr>
              <CpTableHeaderCell>الدور</CpTableHeaderCell>
              <CpTableHeaderCell>الوصف</CpTableHeaderCell>
              <CpTableHeaderCell>الصلاحيات</CpTableHeaderCell>
              <CpTableHeaderCell>الأسطح</CpTableHeaderCell>
              <CpTableHeaderCell>المنشئ / السبب</CpTableHeaderCell>
              <CpTableHeaderCell>ملاحظة المراجع</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {roleRequests.state.data.map((request) => (
              <tr key={request.id}>
                <CpTableCell>{request.roleName}</CpTableCell>
                <CpTableCell>{request.description || "بلا وصف"}</CpTableCell>
                <CpTableCell>{request.permissions.join("، ")}</CpTableCell>
                <CpTableCell>{request.surfaces.join("، ")}</CpTableCell>
                <CpTableCell>
                  {request.requestedBy}
                  <br />
                  <CpMutedInline tight>{request.reason}</CpMutedInline>
                </CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={reviewNotes[request.id] ?? ""}
                    onChange={(value) => setReviewNotes((current) => ({ ...current, [request.id]: value }))}
                    placeholder="ملاحظة المراجع — إلزامية عند الرفض"
                    aria-label={`ملاحظة مراجعة الدور ${request.roleName}`}
                  />
                </CpTableCell>
                <CpTableCell>
                  <CpButton variant="brand" disabled={submitting} onClick={() => void review(request.id, request.version, "approved")}>
                    اعتماد تعريف الدور
                  </CpButton>{" "}
                  <CpButton
                    variant="danger"
                    disabled={submitting || (reviewNotes[request.id] ?? "").trim().length < 5}
                    onClick={() => void review(request.id, request.version, "rejected")}
                  >
                    رفض التعريف
                  </CpButton>
                </CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}
    </QueuePageFrame>
  );
}

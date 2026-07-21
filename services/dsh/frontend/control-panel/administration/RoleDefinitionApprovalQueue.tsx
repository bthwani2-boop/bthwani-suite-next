"use client";

import React, { useState } from "react";
import {
  CpButton,
  CpPageHeader,
  CpStatePanel,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
import { useRoleDefinitionApprovalController } from "../../shared/administration";

const AVAILABLE_PERMISSIONS = [
  "administration.read",
  "administration.manage",
  "administration.approve",
] as const;

export function RoleDefinitionApprovalQueue() {
  const roleRequests = useRoleDefinitionApprovalController("authenticated", "pending");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [permissions, setPermissions] = useState<readonly string[]>(["administration.read"]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const togglePermission = (permission: string) => {
    setPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
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
        reason: reason.trim(),
      });
      setName("");
      setDescription("");
      setReason("");
      setPermissions(["administration.read"]);
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
    <DataTablePageFrame
      dir="rtl"
      header={<CpPageHeader title="تعريف الأدوار — Maker / Checker" />}
      stateView={
        roleRequests.state.kind === "loading" ? <CpStatePanel role="status" title="جارٍ تحميل طلبات تعريف الأدوار…" />
          : roleRequests.state.kind === "error" ? <CpStatePanel role="alert" title={roleRequests.state.message} />
          : undefined
      }
    >
      <section style={styles.content}>
        <article style={styles.card}>
          <strong>طلب تعريف دور جديد</strong>
          <div style={styles.formGrid}>
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
          </div>
          <div style={styles.permissionRow} aria-label="صلاحيات الدور">
            {AVAILABLE_PERMISSIONS.map((permission) => (
              <CpButton
                key={permission}
                onClick={() => togglePermission(permission)}
                aria-pressed={permissions.includes(permission)}
                style={permissions.includes(permission) ? styles.selectedPermission : styles.permission}
              >
                {permission}
              </CpButton>
            ))}
          </div>
          <CpButton
            disabled={submitting || name.trim().length < 3 || reason.trim().length < 5 || permissions.length === 0}
            onClick={() => void requestRole()}
          >
            إرسال تعريف الدور للمراجعة
          </CpButton>
        </article>

        {actionError ? <CpStatePanel role="alert" title={actionError} /> : null}

        {roleRequests.state.kind === "success" && roleRequests.state.data.length === 0 ? (
          <CpStatePanel role="status" title="لا توجد طلبات تعريف أدوار معلقة." />
        ) : null}

        {roleRequests.state.kind === "success" ? roleRequests.state.data.map((request) => (
          <article key={request.id} style={styles.card}>
            <strong>{request.roleName}</strong>
            <span>{request.description || "بلا وصف"}</span>
            <span>الصلاحيات: {request.permissions.join("، ")}</span>
            <span>المنشئ: {request.requestedBy}</span>
            <span>السبب: {request.reason}</span>
            <CpTextInput
              value={reviewNotes[request.id] ?? ""}
              onChange={(value) => setReviewNotes((current) => ({ ...current, [request.id]: value }))}
              placeholder="ملاحظة المراجع — إلزامية عند الرفض"
              aria-label={`ملاحظة مراجعة الدور ${request.roleName}`}
            />
            <div style={styles.actionRow}>
              <CpButton disabled={submitting} onClick={() => void review(request.id, request.version, "approved")}>
                اعتماد تعريف الدور
              </CpButton>
              <CpButton
                disabled={submitting || (reviewNotes[request.id] ?? "").trim().length < 5}
                onClick={() => void review(request.id, request.version, "rejected")}
              >
                رفض التعريف
              </CpButton>
            </div>
          </article>
        )) : null}
      </section>
    </DataTablePageFrame>
  );
}

const styles = WebStyleSheet.create({
  content: {
    display: "grid",
    gap: "1rem",
  },
  card: {
    display: "grid",
    gap: "0.75rem",
    padding: "1rem",
    border: "1px solid var(--card-border, currentColor)",
    borderRadius: "1rem",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "0.75rem",
  },
  permissionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  permission: {
    opacity: 0.7,
  },
  selectedPermission: {
    opacity: 1,
    fontWeight: 700,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
});

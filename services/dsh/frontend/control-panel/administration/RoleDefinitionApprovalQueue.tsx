"use client";
import { Button } from "@bthwani/ui-kit";

import React, { useState } from "react";
import {
  CpMutedInline,
  CpPageHeader,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput } from "@bthwani/control-panel/components";
import { QueuePageFrame } from "@bthwani/control-panel/shell";
import {
  useAdministrationPermissionVocabularyController,
  useRoleDefinitionApprovalController } from "../../shared/administration";
import { administrationExecutionStatusLabel } from "../../shared/administration/administration-registry";
import { useIdentitySession } from "@bthwani/core-identity";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";

export function RoleDefinitionApprovalQueue() {
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canRequest = hasServiceControlPanelPermission(identity, "dsh", "administration.role.request");
  const canReview = hasServiceControlPanelPermission(identity, "dsh", "administration.role.approve");
  const roleRequests = useRoleDefinitionApprovalController("authenticated", "pending", canReview);
  const vocabulary = useAdministrationPermissionVocabularyController("authenticated", canRequest);
  const availablePermissions = vocabulary.state.kind === "success"
    ? vocabulary.state.data.map((entry) => entry.action)
    : [];
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [active, setActive] = useState(true);
  const [permissions, setPermissions] = useState<readonly string[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [replacementReasonCodes, setReplacementReasonCodes] = useState<Record<string, string>>({});
  const [replacementReasons, setReplacementReasons] = useState<Record<string, string>>({});
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
        active,
        permissions,
        reason: reason.trim() });
      setName("");
      setDescription("");
      setReason("");
      setActive(true);
      setPermissions([]);
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

  const replaceTerminalFailure = async (requestId: string, version: number) => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await roleRequests.replaceTerminalFailure(
        requestId,
        version,
        (replacementReasonCodes[requestId] ?? "").trim(),
        (replacementReasons[requestId] ?? "").trim(),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر استبدال تعريف الدور ذي الفشل النهائي.");
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
      {!canRequest && !canReview ? (
        <CpStatePanel role="alert" title="صلاحية إدارة تعريفات الأدوار مطلوبة" description="لا يتم تحميل أو إرسال أي طلب قبل تحقق الصلاحية الدقيقة." />
      ) : null}
      {canRequest ? <section aria-label="طلب تعريف دور جديد">
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
        <Button
          variant={active ? "brand" : "secondary"}
          onClick={() => setActive((value) => !value)}
          aria-pressed={active}
        >
          الدور فعال
        </Button>
        <strong>صلاحيات العمليات</strong>
        <div role="group" aria-label="صلاحيات الدور">
          {availablePermissions.map((permission) => (
            <Button
              key={permission}
              variant={permissions.includes(permission) ? "brand" : "secondary"}
              onClick={() => togglePermission(permission)}
              aria-pressed={permissions.includes(permission)}
            >
              {permission}
            </Button>
          ))}
        </div>
        <CpStatePanel
          role="status"
          title="لوحة التحكم سطح إلزامي"
          description="تُختار الصلاحيات من قاموس Identity المعياري، ولوحة التحكم هي سطح الإدارة الوحيد لهذا الدور."
        />
        <Button
          variant="primary"
          disabled={submitting || name.trim().length < 3 || reason.trim().length < 5 || permissions.length === 0}
          onClick={() => void requestRole()}
        >
          إرسال تعريف الدور للمراجعة
        </Button>
      </section> : null}

      {actionError ? <CpStateView kind="error" title={actionError} /> : null}

      {canReview && roleRequests.state.kind === "success" && roleRequests.state.data.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد طلبات تعريف أدوار معلقة." />
      ) : null}

      {canReview && roleRequests.state.kind === "success" && roleRequests.state.data.length > 0 ? (
        <CpTable aria-label="طلبات تعريف الأدوار المعلقة">
          <thead>
            <tr>
              <CpTableHeaderCell>الدور</CpTableHeaderCell>
              <CpTableHeaderCell>الوصف</CpTableHeaderCell>
              <CpTableHeaderCell>الصلاحيات</CpTableHeaderCell>
              <CpTableHeaderCell>الأسطح</CpTableHeaderCell>
              <CpTableHeaderCell>المنشئ / السبب</CpTableHeaderCell>
              <CpTableHeaderCell>حالة التنفيذ المعياري</CpTableHeaderCell>
              <CpTableHeaderCell>ملاحظة المراجع</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {roleRequests.state.data.map((request) => {
              const reviewable = request.status === "pending" && request.executionStatus !== "failed_terminal";
              const replacementCode = replacementReasonCodes[request.id] ?? "";
              const replacementReason = replacementReasons[request.id] ?? "";
              return <tr key={request.id}>
                <CpTableCell>{request.roleName}</CpTableCell>
              <CpTableCell>{request.description || "بلا وصف"}</CpTableCell>
              <CpTableCell>{request.permissions.join("، ")}</CpTableCell>
              <CpTableCell>control-panel</CpTableCell>
                <CpTableCell>
                  {request.requestedBy}
                  <br />
                  <CpMutedInline tight>{request.reason}</CpMutedInline>
                </CpTableCell>
                <CpTableCell>{administrationExecutionStatusLabel(request.executionStatus)}</CpTableCell>
                <CpTableCell>
                  <CpTextInput
                    value={reviewNotes[request.id] ?? ""}
                    onChange={(value) => setReviewNotes((current) => ({ ...current, [request.id]: value }))}
                    placeholder="ملاحظة المراجع — إلزامية عند الرفض"
                    aria-label={`ملاحظة مراجعة الدور ${request.roleName}`}
                  />
                </CpTableCell>
                <CpTableCell>
                  <Button variant="brand" disabled={submitting || !reviewable} onClick={() => void review(request.id, request.version, "approved")}>
                    اعتماد تعريف الدور
                  </Button>{" "}
                  <Button
                    variant="danger"
                    disabled={submitting || !reviewable || (reviewNotes[request.id] ?? "").trim().length < 5}
                    onClick={() => void review(request.id, request.version, "rejected")}
                  >
                    رفض التعريف
                  </Button>
                  {request.executionStatus === "failed_terminal" && canRequest ? <>
                    <CpTextInput
                      value={replacementCode}
                      onChange={(value) => setReplacementReasonCodes((current) => ({ ...current, [request.id]: value }))}
                      placeholder="رمز السبب مثل permission_vocabulary_changed"
                      aria-label={`رمز سبب استبدال ${request.roleName}`}
                    />
                    <CpTextInput
                      value={replacementReason}
                      onChange={(value) => setReplacementReasons((current) => ({ ...current, [request.id]: value }))}
                      placeholder="سبب الطلب البديل — خمسة أحرف على الأقل"
                      aria-label={`سبب الطلب البديل ${request.roleName}`}
                    />
                    <Button
                      variant="primary"
                      disabled={submitting || !/^[a-z][a-z0-9_]{2,63}$/.test(replacementCode.trim()) || replacementReason.trim().length < 5}
                      onClick={() => void replaceTerminalFailure(request.id, request.version)}
                    >
                      تثبيت الفشل وإنشاء طلب بديل
                    </Button>
                  </> : null}
                </CpTableCell>
              </tr>
            })}
          </tbody>
        </CpTable>
      ) : null}
    </QueuePageFrame>
  );
}

"use client";

import React, { useState } from "react";
import { CpButton, CpTextInput, CpStatePanel } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { WorkforceScopeManager } from "../../hr/WorkforceScopeManager";
import type { ProviderKind } from "../../../../shared/workforce";

export function FieldAssignmentWorkspace() {
  const [actorIdInput, setActorIdInput] = useState("");
  const [activeActorId, setActiveActorId] = useState("");
  const [activeRole, setActiveRole] = useState<ProviderKind>("field");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          padding: "24px",
          border: "1px solid var(--bthwani-control-panel-border)",
          borderRadius: "16px",
          background: "var(--bthwani-control-panel-surface)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <Text role="titleMd">تحديد الميداني أو الكابتن</Text>
        <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>
          يرجى إدخال معرف الميداني أو الكابتن (Actor ID) لعرض المتاجر المسندة إليه وتعديلها.
        </Text>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
          <div style={{ flex: 1, maxWidth: "400px" }}>
            <Text role="bodySm" style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>
              معرف الميداني (Actor ID)
            </Text>
            <CpTextInput
              value={actorIdInput}
              onChange={setActorIdInput}
              placeholder="مثال: field-12345"
              aria-label="معرف الميداني"
            />
          </div>
          <CpButton
            variant="primary"
            disabled={actorIdInput.trim().length === 0}
            onClick={() => {
              setActiveActorId(actorIdInput.trim());
              setActiveRole(actorIdInput.trim().startsWith("captain-") ? "captain" : "field");
            }}
          >
            بحث وعرض
          </CpButton>
        </div>
      </div>

      {activeActorId ? (
        <div
          style={{
            padding: "24px",
            border: "1px solid var(--bthwani-control-panel-border)",
            borderRadius: "16px",
            background: "var(--bthwani-control-panel-surface)",
          }}
        >
          <WorkforceScopeManager actorId={activeActorId} actorRole={activeRole} />
        </div>
      ) : (
        <CpStatePanel
          role="status"
          title="لم يتم تحديد ميداني"
          description="أدخل معرف الميداني في الأعلى للبدء بإسناد المتاجر والمناطق."
        />
      )}
    </div>
  );
}

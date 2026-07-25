"use client";

// Search-based supervisor selection — replaces the old free-text actor-id
// box. The operator can only pick a validated candidate returned by the
// server; there is no way to type an arbitrary actor id here.
import React from "react";
import { CpButton, CpMutedInline, CpTextInput } from "@bthwani/control-panel/components";
import { Text } from "@bthwani/ui-kit";
import { useSupervisorSearchController } from "../../shared/workforce";
import type { ProviderKind, SupervisorCandidate } from "../../shared/workforce";

export function SupervisorPicker(props: {
  readonly kind: ProviderKind;
  readonly selected: SupervisorCandidate | null;
  readonly onSelect: (candidate: SupervisorCandidate | null) => void;
  readonly disabled?: boolean;
}) {
  const search = useSupervisorSearchController(props.kind);

  if (props.selected) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="bodySm">
          {props.selected.username}
          {props.selected.phoneMasked ? ` — ${props.selected.phoneMasked}` : ""}
        </Text>
        {!props.disabled ? <CpButton variant="ghost" onClick={() => props.onSelect(null)}>تغيير</CpButton> : null}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Text role="bodySm" style={{ fontWeight: "bold" }}>المشرف المسؤول</Text>
      <CpTextInput
        value={search.query}
        onChange={search.setQuery}
        placeholder="ابحث بالاسم أو الرقم (حرفان على الأقل)"
        disabled={props.disabled ?? false}
        aria-label="المشرف المسؤول"
      />
      {!props.disabled ? (
        <>
          {search.loading ? <CpMutedInline tight>جارٍ البحث…</CpMutedInline> : null}
          {search.error ? <CpMutedInline tight>{search.error}</CpMutedInline> : null}
          {!search.loading && search.query.trim().length >= 2 && search.candidates.length === 0 && !search.error ? (
            <CpMutedInline tight>لا توجد نتائج مطابقة</CpMutedInline>
          ) : null}
          {search.candidates.map((candidate) => (
            <div
              key={candidate.actorId}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <Text role="bodySm">
                {candidate.username}
                {candidate.phoneMasked ? ` — ${candidate.phoneMasked}` : ""}
              </Text>
              <CpButton variant="secondary" onClick={() => props.onSelect(candidate)}>اختيار</CpButton>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

export default SupervisorPicker;

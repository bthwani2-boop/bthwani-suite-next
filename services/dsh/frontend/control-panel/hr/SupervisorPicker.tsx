"use client";

// Search-based supervisor selection — replaces the old free-text actor-id
// box. The operator can only pick a validated candidate returned by the
// server; there is no way to type an arbitrary actor id here.
import React from "react";
import { Box, Button, Text, TextField, spacing } from "@bthwani/ui-kit";
import { useSupervisorSearchController } from "../../shared/workforce";
import type { ProviderKind, SupervisorCandidate } from "../../shared/workforce";

export function SupervisorPicker(props: {
  readonly kind: ProviderKind;
  readonly selected: SupervisorCandidate | null;
  readonly onSelect: (candidate: SupervisorCandidate | null) => void;
}) {
  const search = useSupervisorSearchController(props.kind);

  if (props.selected) {
    return (
      <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="bodySm">
          {props.selected.username}
          {props.selected.phoneMasked ? ` — ${props.selected.phoneMasked}` : ""}
        </Text>
        <Button label="تغيير" tone="ghost" onPress={() => props.onSelect(null)} />
      </Box>
    );
  }

  return (
    <Box style={{ gap: spacing[2] }}>
      <TextField
        label="المشرف المسؤول"
        value={search.query}
        onChangeText={search.setQuery}
        placeholder="ابحث بالاسم أو الرقم (حرفان على الأقل)"
      />
      {search.loading && (
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>جارٍ البحث…</Text>
      )}
      {search.error && (
        <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{search.error}</Text>
      )}
      {!search.loading && search.query.trim().length >= 2 && search.candidates.length === 0 && !search.error && (
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>لا توجد نتائج مطابقة</Text>
      )}
      {search.candidates.map((candidate) => (
        <Box
          key={candidate.actorId}
          style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}
        >
          <Text role="bodySm">
            {candidate.username}
            {candidate.phoneMasked ? ` — ${candidate.phoneMasked}` : ""}
          </Text>
          <Button label="اختيار" tone="secondary" onPress={() => props.onSelect(candidate)} />
        </Box>
      ))}
    </Box>
  );
}

export default SupervisorPicker;

import { useState } from "react";
import {
  CpButton,
  CpSelect,
  CpTextInput,
} from "@bthwani/app-shell";
import type {
  DshStoreAdminDetail,
  StoreActionState,
} from "../../../shared/store";
import type { OperatorStoreGovernanceRequest } from "../../../../clients/store-discovery-client";

type Props = {
  readonly store: DshStoreAdminDetail;
  readonly actionState: StoreActionState;
  readonly onSubmit: (input: OperatorStoreGovernanceRequest) => Promise<void>;
};

export function StoreGovernanceActions({ store, actionState, onSubmit }: Props) {
  const [action, setAction] = useState<OperatorStoreGovernanceRequest["action"]>("lifecycle");
  const [value, setValue] = useState("active");
  const [reason, setReason] = useState("");

  const options = action === "lifecycle"
    ? [
        { value: "active", label: "نشط" },
        { value: "inactive", label: "غير نشط" },
        { value: "temporarily_closed", label: "إغلاق مؤقت" },
        { value: "unavailable", label: "غير متاح" },
      ]
    : action === "visibility"
      ? [
          { value: "visible", label: "ظاهر للعملاء" },
          { value: "hidden", label: "مخفي عن العملاء" },
        ]
      : [
          { value: "serviceable", label: "قابل للخدمة" },
          { value: "limited", label: "خدمة محدودة" },
          { value: "out_of_area", label: "خارج النطاق" },
          { value: "unavailable", label: "غير متاح" },
        ];

  return (
    <section
      aria-label="إجراءات حوكمة المتجر"
      style={{
        display: "grid",
        gap: "0.75rem",
        padding: "1rem",
        border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
        borderRadius: "1rem",
        background: "Canvas",
      }}
    >
      <div>
        <strong>حوكمة {store.displayName}</strong>
        <p style={{ margin: "0.25rem 0 0", opacity: 0.7 }}>
          كل إجراء محمي بالهوية، version check، idempotency، وسجل تدقيق.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem" }}>
        <CpSelect
          value={action}
          aria-label="نوع إجراء الحوكمة"
          options={[
            { value: "lifecycle", label: "دورة حياة المتجر" },
            { value: "visibility", label: "الرؤية للعملاء" },
            { value: "serviceability", label: "قابلية الخدمة" },
          ]}
          onChange={(next) => {
            const nextAction = next as OperatorStoreGovernanceRequest["action"];
            setAction(nextAction);
            setValue(nextAction === "visibility" ? "visible" : nextAction === "serviceability" ? "serviceable" : "active");
          }}
        />
        <CpSelect
          value={value}
          aria-label="القيمة الجديدة"
          options={options}
          onChange={setValue}
        />
        <CpTextInput
          value={reason}
          onChange={setReason}
          placeholder="سبب الإجراء"
          aria-label="سبب إجراء الحوكمة"
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <CpButton
          disabled={reason.trim().length < 3 || actionState.kind === "submitting"}
          onClick={() => void onSubmit({
            expectedVersion: store.version,
            action,
            value,
            reason: reason.trim(),
          })}
        >
          {actionState.kind === "submitting" ? "جاري التطبيق…" : "تطبيق الإجراء وتسجيله"}
        </CpButton>
        {actionState.kind === "success" && <span role="status">تم التطبيق والتدقيق.</span>}
        {(actionState.kind === "error" || actionState.kind === "conflict") && (
          <span role="alert">{actionState.message}</span>
        )}
      </div>
    </section>
  );
}

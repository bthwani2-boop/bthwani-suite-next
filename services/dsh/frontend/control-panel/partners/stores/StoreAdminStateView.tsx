import { CpButton } from "@bthwani/app-shell";
import type { DshStoreAdminListState } from "../../../shared/store";

type Props = {
  readonly state: DshStoreAdminListState;
  readonly onRetry: () => void;
};

export function StoreAdminStateView({ state, onRetry }: Props) {
  if (state.kind === "loading") {
    return (
      <div style={containerStyle} role="status" aria-live="polite">
        <span style={{ fontSize: "1.25rem" }}>جاري التحميل…</span>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div style={containerStyle} role="status">
        <span style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          لا توجد متاجر
        </span>
        <span style={{ fontSize: "0.875rem", opacity: 0.65 }}>
          لم يتم العثور على أي متاجر. تحقق من الفلاتر أو تأكد من وجود بيانات في قاعدة البيانات.
        </span>
        <RetryButton onRetry={onRetry} />
      </div>
    );
  }

  if (state.kind === "service_unavailable") {
    return (
      <div style={containerStyle} role="alert">
        <span style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          الخدمة غير متاحة
        </span>
        <span style={{ fontSize: "0.875rem", opacity: 0.65 }}>
          تعذر الوصول إلى DSH API (58080). تأكد من تشغيل `pnpm runtime:up`.
        </span>
        <RetryButton onRetry={onRetry} />
      </div>
    );
  }

  if (state.kind === "permission_denied") {
    return (
      <div style={containerStyle} role="alert">
        <span style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          غير مصرح
        </span>
        <span style={{ fontSize: "0.875rem", opacity: 0.65 }}>
          HTTP {state.statusCode} — صلاحيات إضافية مطلوبة للوصول إلى إدارة المتاجر.
        </span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div style={containerStyle} role="alert">
        <span style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          تعذر تحميل المتاجر
        </span>
        <code
          style={{
            fontSize: "0.75rem",
            opacity: 0.75,
            fontFamily: "monospace",
            marginBottom: "0.75rem",
            wordBreak: "break-all",
            maxWidth: "32rem",
            textAlign: "center",
          }}
        >
          {state.message}
        </code>
        <RetryButton onRetry={onRetry} />
      </div>
    );
  }

  return null;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <CpButton
      onClick={onRetry}
      style={{
        marginTop: "0.75rem",
        padding: "0.375rem 1rem",
        border: "1px solid currentColor",
        borderRadius: "0.25rem",
        background: "transparent",
        cursor: "pointer",
        fontSize: "0.875rem",
      }}
    >
      إعادة المحاولة
    </CpButton>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "3rem 1rem",
  gap: "0.5rem",
  textAlign: "center",
  minHeight: "12rem",
};

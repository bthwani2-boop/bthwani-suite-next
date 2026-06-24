import { CpRetryButton, CpStatePanel } from "@bthwani/ui-kit/web";
import type { DshStoreAdminListState } from "../../../shared/store";

type Props = {
  readonly state: DshStoreAdminListState;
  readonly onRetry: () => void;
};

export function StoreAdminStateView({ state, onRetry }: Props) {
  if (state.kind === "loading") {
    return (
      <CpStatePanel role="status" title="جاري التحميل…" />
    );
  }

  if (state.kind === "empty") {
    return (
      <CpStatePanel
        role="status"
        title="لا توجد متاجر"
        description="لم يتم العثور على أي متاجر. تحقق من الفلاتر أو تأكد من وجود بيانات في قاعدة البيانات."
      >
        <RetryButton onRetry={onRetry} />
      </CpStatePanel>
    );
  }

  if (state.kind === "service_unavailable") {
    return (
      <CpStatePanel
        role="alert"
        title="الخدمة غير متاحة"
        description="تعذر الوصول إلى DSH API (58080). تأكد من تشغيل pnpm runtime:up."
      >
        <RetryButton onRetry={onRetry} />
      </CpStatePanel>
    );
  }

  if (state.kind === "permission_denied") {
    return (
      <CpStatePanel
        role="alert"
        title="غير مصرح"
        description={`HTTP ${state.statusCode} — صلاحيات إضافية مطلوبة للوصول إلى إدارة المتاجر.`}
      />
    );
  }

  if (state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر تحميل المتاجر" code={state.message}>
        <RetryButton onRetry={onRetry} />
      </CpStatePanel>
    );
  }

  return null;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <CpRetryButton onClick={onRetry}>
      إعادة المحاولة
    </CpRetryButton>
  );
}

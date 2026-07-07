import React from 'react';
import { Box, Button, Divider, MobileScrollView, SectionHeader, StateView, Text, spacing } from '@bthwani/ui-kit';

export type DshOperationScreenState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled';

export type DshOperationScreenProps = {
  state?: DshOperationScreenState;
  title: string;
  subtitle: string;
  content?: React.ReactNode;
  primaryActionLabel?: string | undefined;
  secondaryActionLabel?: string | undefined;
  tertiaryActionLabel?: string | undefined;
  onPrimaryAction?: (() => void) | undefined;
  onSecondaryAction?: (() => void) | undefined;
  onTertiaryAction?: (() => void) | undefined;
  onRetry?: (() => void) | undefined;
  primaryActionDisabled?: boolean | undefined;
  primaryActionLoading?: boolean | undefined;
};

function renderNonReadyState(state: DshOperationScreenState, onRetry?: () => void) {
  if (state === 'loading') {
    return <StateView tone="info" loading title="جاري التحميل..." description="برجاء الانتظار" />;
  }

  if (state === 'empty') {
    return <StateView tone="neutral" title="لا توجد بيانات" description="القائمة فارغة حالياً" actionLabel="إعادة المحاولة" onActionPress={onRetry} />;
  }

  if (state === 'offline') {
    return <StateView tone="warning" title="لا يوجد اتصال بالشبكة" description="تأكد من اتصالك بالإنترنت" actionLabel="إعادة المحاولة" onActionPress={onRetry} />;
  }

  if (state === 'disabled') {
    return <StateView tone="warning" title="متوقف مؤقتًا" description="يبقى خيار إعادة المحاولة متاحًا عند إعادة تفعيل هذه الخطوة." actionLabel="إعادة المحاولة" onActionPress={onRetry} />;
  }

  return <StateView tone="danger" title="الشاشة غير متاحة" description="أعد المحاولة أولًا، وإذا استمرت المشكلة ارجع إلى الخطوة السابقة." actionLabel="إعادة المحاولة" onActionPress={onRetry} />;
}

export function DshOperationScreen({
  state = 'ready',
  title,
  subtitle,
  content,
  primaryActionLabel,
  secondaryActionLabel,
  tertiaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onTertiaryAction,
  onRetry,
  primaryActionDisabled,
  primaryActionLoading,
}: DshOperationScreenProps) {
  const hasActions = Boolean(primaryActionLabel || secondaryActionLabel || tertiaryActionLabel);

  if (state !== 'ready') {
    return renderNonReadyState(state, onRetry);
  }

  return (
    <MobileScrollView padding={4} gap={3}>
      <Box gap={2}>
        <Text role="titleLg">{title}</Text>
        <Text role="bodySm" tone="muted">{subtitle}</Text>
      </Box>

      {content}

      {hasActions ? (
        <Box gap={3} style={{ marginTop: spacing[3] }}>
          <Divider />
          <SectionHeader title="الإجراء" subtitle="زر رئيسي واحد مع مسار رجوع صغير وواضح." />
          <Box gap={2}>
            {primaryActionLabel ? <Button label={primaryActionLabel} onPress={onPrimaryAction} disabled={primaryActionDisabled} loading={primaryActionLoading} accessibilityLabel={`تأكيد: ${primaryActionLabel}`} /> : null}
            {secondaryActionLabel ? <Button label={secondaryActionLabel} tone="secondary" onPress={onSecondaryAction} accessibilityLabel={`إجراء ثانوي: ${secondaryActionLabel}`} /> : null}
            {tertiaryActionLabel ? <Button label={tertiaryActionLabel} tone="ghost" onPress={onTertiaryAction} accessibilityLabel={`رجوع: ${tertiaryActionLabel}`} /> : null}
          </Box>
        </Box>
      ) : null}
    </MobileScrollView>
  );
}

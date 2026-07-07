import React from 'react';
import { View } from 'react-native';
import {
  Button,
  Sheet,
  StateView,
  Text,
  spacing,
  colorRoles,
} from '@bthwani/ui-kit';

export type AcceptanceTimerSheetProps = {
  visible?: boolean;
  orderId?: string;
  secondsRemaining?: number;
  orderSummary?: string;
  state?: 'countdown' | 'expired' | 'accepted' | 'loading';
  onAccept?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
  onClose?: () => void;
};

export function AcceptanceTimerSheet({
  visible = false,
  orderId = '',
  secondsRemaining = 60,
  orderSummary = 'طلب جديد',
  state = 'countdown',
  onAccept,
  onDecline,
  onClose,
}: AcceptanceTimerSheetProps) {
  const [remaining, setRemaining] = React.useState(secondsRemaining);

  React.useEffect(() => {
    if (state !== 'countdown' || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state, remaining]);

  React.useEffect(() => {
    setRemaining(secondsRemaining);
  }, [secondsRemaining, visible]);

  const isExpired = state === 'expired' || (state === 'countdown' && remaining <= 0);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose?.();
    }
  };

  return (
    <Sheet open={visible} onOpenChange={handleOpenChange} title="طلب جديد يحتاج قبولك">
      {state === 'loading' ? (
        <StateView loading title="جاري تسجيل ردك..." description="" />
      ) : state === 'accepted' ? (
        <StateView tone="success" title="تم قبول الطلب" description="يرجى الاستعداد لبدء التحضير." actionLabel="إغلاق" onActionPress={onClose || (() => {})} />
      ) : isExpired ? (
        <StateView tone="neutral" title="انتهت مهلة القبول" description="انتهت مهلة قبول الطلب. تم إعادة توجيهه تلقائياً." actionLabel="إغلاق" onActionPress={onClose || (() => {})} />
      ) : (
        <View style={{ gap: spacing[4], padding: spacing[4] }}>
          <View style={{ gap: spacing[1] }}>
            <Text role="titleMd" style={{ textAlign: 'center' }}>{orderSummary}</Text>
            <Text role="body" tone="muted" style={{ textAlign: 'center' }}>يُرجى القبول أو الرفض قبل:</Text>
            <Text role="titleLg" tone="action" style={{ fontSize: 48, textAlign: 'center', marginVertical: spacing[2] }}>{remaining}s</Text>
          </View>
          <View style={{ gap: spacing[2] }}>
            <Button label="قبول الطلب" tone="primary" onPress={() => onAccept?.(orderId)} />
            <Button label="رفض الطلب" tone="danger" onPress={() => onDecline?.(orderId)} />
          </View>
        </View>
      )}
    </Sheet>
  );
}

// export default AcceptanceTimerSheet; // Unused default export
import React from 'react';
import { KeyValueList } from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type {
	DshCaptainOrderAction,
	DshCaptainOrderDetailSummary,
	DshCaptainOrderStage,
} from '../../shared/orders';

export const OrderActionSection = React.memo(function OrderActionSection({
	action,
	summary,
	onActionPress,
	onBackToInbox,
}: {
	action: Exclude<DshCaptainOrderAction, 'proof-upload' | 'back-to-inbox' | 'next-order'>;
	summary?: DshCaptainOrderDetailSummary | undefined;
	onActionPress?: ((action: DshCaptainOrderAction) => void) | undefined;
	onBackToInbox?: (() => void) | undefined;
}) {
	const actionCopy: Record<typeof action, { title: string; subtitle: string; primaryLabel: string; secondaryLabel?: string; kind: DshCaptainOrderStage }> = {
		accept: {
			title: 'قبول الطلب',
			subtitle: 'أكد أن الكابتن قبل الطلب والتزم بالاستلام.',
			primaryLabel: 'قبول الطلب',
			secondaryLabel: 'العودة إلى دليل الدعم',
			kind: 'accepted',
		},
		'order-offer-reject': {
			title: 'رفض العرض',
			subtitle: 'ارفض العرض مع سبب تشغيلي ظاهر.',
			primaryLabel: 'رفض الطلب',
			secondaryLabel: 'العودة إلى دليل الدعم',
			kind: 'offer',
		},
		pickup: {
			title: 'استلام الطلب',
			subtitle: 'أكد استلام الفرع قبل بدء مرحلة التوصيل.',
			primaryLabel: 'تأكيد الاستلام',
			secondaryLabel: 'العودة إلى دليل الدعم',
			kind: 'pickup',
		},
		deliver: {
			title: 'تسليم الطلب',
			subtitle: 'أغلق المسار مع تأكيد التسليم النهائي.',
			primaryLabel: 'تأكيد التسليم',
			secondaryLabel: 'العودة إلى دليل الدعم',
			kind: 'delivery',
		},
	};

	const copy = actionCopy[action];

	return (
		<DshOperationScreen
			title={copy.title}
			subtitle={copy.subtitle}
			content={
				<KeyValueList
					items={[
						{ label: 'الطلب', value: summary?.orderId ?? '', tone: 'brand' },
						{ label: 'الاستلام', value: summary?.pickupLabel ?? '' },
						{ label: 'التسليم', value: summary?.dropoffLabel ?? '' },
						{ label: 'المرحلة', value: summary?.currentStageLabel ?? '', tone: 'warning' },
					]}
				/>
			}
			primaryActionLabel={copy.primaryLabel}
			secondaryActionLabel={copy.secondaryLabel}
			onPrimaryAction={() => onActionPress?.(action)}
			onSecondaryAction={onBackToInbox}
		/>
	);
});

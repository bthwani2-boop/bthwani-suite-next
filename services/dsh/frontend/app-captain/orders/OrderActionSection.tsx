import React from 'react';
import { KeyValueList } from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type {
	DshCaptainDeliveryActionId,
	DshCaptainOrderAction,
	DshCaptainOrderDetailSummary,
} from '../../shared/orders';

export const OrderActionSection = React.memo(function OrderActionSection({
	action,
	summary,
	onActionPress,
	onBackToInbox,
}: {
	action: Exclude<DshCaptainDeliveryActionId, 'none'>;
	summary?: DshCaptainOrderDetailSummary | undefined;
	onActionPress?: ((action: DshCaptainOrderAction) => void) | undefined;
	onBackToInbox?: (() => void) | undefined;
}) {
	const actionCopy: Record<typeof action, { title: string; subtitle: string; primaryLabel: string; secondaryLabel?: string }> = {
		arrive_store: {
			title: 'الوصول إلى المتجر',
			subtitle: 'ثبّت الوصول من GPS المصدق قبل بدء تسليم العهدة.',
			primaryLabel: 'تأكيد الوصول للمتجر',
			secondaryLabel: 'العودة إلى دليل الدعم',
		},
		pickup: {
			title: 'استلام الطلب',
			subtitle: 'أكد استلام الفرع بعد اكتمال تأكيد عهدة المتجر.',
			primaryLabel: 'تأكيد الاستلام',
			secondaryLabel: 'العودة إلى دليل الدعم',
		},
		arrive_customer: {
			title: 'الوصول إلى العميل',
			subtitle: 'ثبّت الوصول من GPS المصدق قبل فتح إثبات التسليم.',
			primaryLabel: 'تأكيد الوصول للعميل',
			secondaryLabel: 'العودة إلى دليل الدعم',
		},
		open_pod: {
			title: 'إثبات التسليم',
			subtitle: 'افتح إثبات التسليم بعد تثبيت الوصول إلى العميل.',
			primaryLabel: 'فتح إثبات التسليم',
			secondaryLabel: 'العودة إلى دليل الدعم',
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

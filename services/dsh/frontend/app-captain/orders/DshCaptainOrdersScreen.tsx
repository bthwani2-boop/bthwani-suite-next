import React from 'react';
import {
	Box,
	Button,
	Divider,
	KeyValueList,
	ListItem,
	MobileScrollView,
	SectionHeader,
	StateView,
	Surface,
	Text,
	spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen, type DshOperationScreenState } from '../DshOperationScreen';
import { OrderInboxSection, resolveServiceTypeBadge } from './OrderInboxSection';
import { OrderDetailSection } from './OrderDetailSection';
import { OrderChatSection } from './OrderChatSection';
import { OrderBellSection } from './OrderBellSection';
import { OrderActionSection } from './OrderActionSection';
import { OrderProofSection } from './OrderProofSection';
import { SimpleSupportScreen } from './SimpleSupportScreen';
import type {
	DshCaptainOrderAction,
	DshCaptainOrderBellItem,
	DshCaptainOrderDetailSummary,
	DshCaptainOrderId,
	DshCaptainOrderMessage,
	DshCaptainOrderMode,
	DshCaptainOrderProofStatus,
	DshCaptainOrdersScreenState,
} from '../../shared/orders';

const SurfaceAny = Surface as any;

export type { DshCaptainOrderDetailSummary } from '../../shared/orders';

export type DshCaptainOrdersScreenProps = {
	section?: DshCaptainOrderMode | undefined;
	state?: DshCaptainOrdersScreenState | undefined;
	items?: DshCaptainOrderBellItem[] | undefined;
	summary?: DshCaptainOrderDetailSummary | undefined;
	messages?: DshCaptainOrderMessage[] | undefined;
	proofStatus?: DshCaptainOrderProofStatus | undefined;
	onOpenOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;
	onOpenNextOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;
	onBackToInbox?: (() => void) | undefined;
	onRetry?: (() => void) | undefined;
	onActionPress?: ((action: DshCaptainOrderAction) => void) | undefined;
};

function renderOrdersState(state: DshCaptainOrdersScreenState, onRetry?: () => void) {
	if (state === 'availability-toggle') {
		return (
			<StateView
				tone="info"
				loading
				title="جارٍ تحديث حالة التوفر..."
				description="يُرجى الانتظار بينما يتم تسجيل حالتك."
			/>
		);
	}

	if (state === 'loading-assignment') {
		return (
			<StateView
				tone="info"
				loading
				title="جارٍ تحميل تفاصيل المهمة..."
				description="تم قبول الطلب. جارٍ جلب تفاصيل الاستلام والتسليم."
			/>
		);
	}

	if (state === 'offer-accepting') {
		return (
			<StateView
				tone="info"
				loading
				title="جارٍ قبول العرض..."
				description="يُرجى الانتظار بينما يتم تسجيل قبول الطلب."
			/>
		);
	}

	if (state === 'offer-accepted') {
		return (
			<StateView
				tone="success"
				title="تم قبول الطلب بنجاح"
				description="سيتم توجيهك إلى تفاصيل الطلب الآن."
				actionLabel={onRetry ? 'عرض تفاصيل الطلب' : undefined}
				onActionPress={onRetry}
			/>
		);
	}

	if (state === 'loading') {
		return (
			<StateView
				tone="info"
				loading
				title="جارٍ تحميل صندوق الكابتن"
				description="أبقِ الطلب التالي ظاهرًا فور توفر بيانات الصف."
			/>
		);
	}

	if (state === 'empty') {
		return (
			<StateView
				tone="neutral"
				title="لا توجد طلبات الآن"
				description="ابقَ جاهزًا. الطلبات الجديدة ستصل هنا أولًا."
				actionLabel={onRetry ? 'تحديث الطلبات' : undefined}
				onActionPress={onRetry}
			/>
		);
	}

	if (state === 'delivered') {
		return (
			<StateView
				tone="success"
				title="تم تسليم كل الطلبات"
				description="أداء ممتاز. حدّث الشاشة لالتقاط المهمة التالية."
				actionLabel={onRetry ? 'التحقق من طلبات جديدة' : undefined}
				onActionPress={onRetry}
			/>
		);
	}

	if (state === 'error') {
		return (
			<StateView
				tone="danger"
				title="صندوق الطلبات غير متاح"
				description="أعد المحاولة وواصل من الطلب التالي من دون تغيير المسار."
				actionLabel="إعادة المحاولة"
				onActionPress={onRetry}
			/>
		);
	}

	return null;
}

export function DshCaptainOrdersScreen({
	section = 'bell',
	state = 'ready',
	items = [],
	summary,
	messages = [],
	proofStatus,
	onOpenOrder,
	onOpenNextOrder,
	onBackToInbox,
	onRetry,
	onActionPress,
}: DshCaptainOrdersScreenProps) {
	if (state !== 'ready') {
		return renderOrdersState(state, onRetry);
	}

	if (section === 'bell') {
		return (
			<DshCaptainOrderOffersListScreen
				items={items}
				onBack={onBackToInbox}
				onSecondaryAction={onBackToInbox}
				onOpenOrder={onOpenOrder}
			/>
		);
	}

	if (section === 'inbox') {
		return (
			<DshCaptainOrdersListScreen
				items={items}
				onBack={onBackToInbox}
				onSecondaryAction={onBackToInbox}
				onOpenOrder={onOpenOrder}
			/>
		);
	}

	if (section === 'detail' && summary) {
		return (
			<DshCaptainOrderGetScreen
				summary={summary}
				onBack={onBackToInbox}
				onSecondaryAction={onBackToInbox}
				onActionPress={onActionPress}
			/>
		);
	}

	if (section === 'chat' && summary) {
		return (
			<OrderChatSection
				orderId={summary.orderId}
				pickupLabel={summary.pickupLabel}
				dropoffLabel={summary.dropoffLabel}
			/>
		);
	}

	if (section === 'proof' && summary) {
		return (
			<OrderProofSection
				summary={summary}
				status={proofStatus}
				onBackToInbox={onBackToInbox}
				onActionPress={onActionPress}
			/>
		);
	}

	return (
		<DshOperationScreen
			state="ready"
			title="صندوق الكابتن"
			subtitle="أبقِ الطلب المفتوح تزامنيًا فور تغيير حالة الموزع المركزي."
			content={
				<OrderInboxSection
					items={items}
					onOpenOrder={onOpenOrder}
				/>
			}
			primaryActionLabel={onBackToInbox ? 'العودة' : undefined}
			onPrimaryAction={onBackToInbox}
		/>
	);
}

export function DshCaptainOrderOffersListScreen({
	items = [],
	onBack,
	onSecondaryAction,
	onOpenOrder,
}: {
	items?: DshCaptainOrderBellItem[] | undefined;
	onBack?: (() => void) | undefined;
	onSecondaryAction?: (() => void) | undefined;
	onOpenOrder?: ((id: DshCaptainOrderId) => void) | undefined;
}) {
	const offers = items.filter((item) => (item as any).kind === 'incoming-offer');
	return (
		<DshOperationScreen
			state="ready"
			title="عروض الكابتن"
			subtitle="اقرأ كل العروض الواردة بقيم المسافة والتسعير قبل قبولها."
			content={
				<OrderInboxSection
					items={offers}
					onOpenOrder={onOpenOrder}
				/>
			}
			primaryActionLabel={onBack ? 'العودة' : undefined}
			secondaryActionLabel={onSecondaryAction ? 'فتح صندوق الطلبات' : undefined}
			onPrimaryAction={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function DshCaptainOrdersListScreen({
	items = [],
	onBack,
	onSecondaryAction,
	onOpenOrder,
}: {
	items?: DshCaptainOrderBellItem[] | undefined;
	onBack?: (() => void) | undefined;
	onSecondaryAction?: (() => void) | undefined;
	onOpenOrder?: ((id: DshCaptainOrderId) => void) | undefined;
}) {
	const activeOrders = items.filter((item) => (item as any).kind !== 'incoming-offer');
	return (
		<DshOperationScreen
			state="ready"
			title="طلبات الكابتن"
			subtitle="أبقِ الطلبات النشطة في صف واحد حتى تكمل إثبات التسليم."
			content={
				<OrderInboxSection
					items={activeOrders}
					onOpenOrder={onOpenOrder}
				/>
			}
			primaryActionLabel={onBack ? 'العودة' : undefined}
			secondaryActionLabel={onSecondaryAction ? 'عرض العروض الواردة' : undefined}
			onPrimaryAction={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function DshCaptainOrderGetScreen({
	summary,
	onBack,
	onSecondaryAction,
	onActionPress,
}: {
	summary?: DshCaptainOrderDetailSummary | undefined;
	onBack?: (() => void) | undefined;
	onSecondaryAction?: (() => void) | undefined;
	onActionPress?: ((action: DshCaptainOrderAction) => void) | undefined;
}) {
	if (!summary) {
		return null;
	}

	const orderAction = ((summary as any).currentStage === 'offer'
		? 'accept'
		: (summary as any).currentStage === 'accepted'
			? 'pickup'
			: 'deliver') as any;

	return (
		<DshOperationScreen
			state="ready"
			title="تفاصيل الطلب"
			subtitle="تفاصيل مهمة التوصيل والجهات والتحصيل COD."
			content={
				<Box gap={4}>
					<OrderDetailSection summary={summary} />
					<Divider />
					<OrderActionSection action={orderAction} summary={summary} onActionPress={onActionPress} />
				</Box>
			}
			primaryActionLabel={onBack ? 'العودة' : undefined}
			secondaryActionLabel={onSecondaryAction ? 'فتح دردشة الدعم' : undefined}
			onPrimaryAction={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function DshCaptainOrderAcceptScreen({
	orderId = 'ORD-9021',
	onBack,
	onAccept,
	onDecline,
}: {
	orderId?: string | undefined;
	onBack?: (() => void) | undefined;
	onAccept?: ((orderId: string) => void) | undefined;
	onDecline?: ((orderId: string) => void) | undefined;
}) {
	return (
		<DshOperationScreen
			state="ready"
			title="عرض توصيل جديد"
			subtitle={`وصلك عرض توصيل للطلب #${orderId}. يرجى القبول أو الرفض.`}
			content={
				<Box gap={4}>
					<SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
						<SectionHeader title="تفاصيل العرض" subtitle="تفاصيل التسعير والمسافة المتوقعة." />
						<KeyValueList
							items={[
								{ label: 'رقم الطلب', value: `#${orderId}`, tone: 'brand' },
								{ label: 'المتجر', value: 'مطعم حضرموت السعيد - الستين' },
								{ label: 'الأرباح المتوقعة', value: '850 ر.ي', tone: 'success' },
								{ label: 'مسافة التوصيل الإجمالية', value: '5.3 كم' },
							]}
						/>
					</SurfaceAny>
				</Box>
			}
			primaryActionLabel="قبول عرض التوصيل"
			secondaryActionLabel="رفض العرض"
			tertiaryActionLabel="العودة"
			onPrimaryAction={() => onAccept?.(orderId)}
			onSecondaryAction={() => onDecline?.(orderId)}
			onTertiaryAction={onBack}
		/>
	);
}

export function DshCaptainOrderPickupScreen({
	onBack,
	onSecondaryAction,
}: {
	onBack?: () => void;
	onSecondaryAction?: () => void;
}) {
	return (
		<SimpleSupportScreen
			title="استلام الطلب"
			subtitle="أكد استلام الطلب من الفرع بعد المطابقة."
			heroTitle="في انتظار الاستلام من المتجر"
			heroDescription="يرجى إبراز رقم الفاتورة والتحقق من المكونات قبل المغادرة."
			primaryLabel="تأكيد الاستلام"
			secondaryLabel="فتح خريطة التوجيه"
			onBack={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function DshCaptainOrderDeliverScreen({
	onBack,
	onSecondaryAction,
}: {
	onBack?: () => void;
	onSecondaryAction?: () => void;
}) {
	return (
		<SimpleSupportScreen
			title="تسليم الطلب"
			subtitle="أكد تسليم الشحنة للعميل عند الباب."
			heroTitle="في انتظار تسليم الشحنة"
			heroDescription="يرجى تحصيل المبلغ المالي وتصوير إثبات التسليم."
			primaryLabel="تأكيد التسليم وتصوير الإثبات"
			secondaryLabel="فتح خريطة التوجيه"
			onBack={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function DshCaptainOrderDetailsScreen({
	onBack,
	onSecondaryAction,
}: {
	onBack?: () => void;
	onSecondaryAction?: () => void;
}) {
	return (
		<SimpleSupportScreen
			title="تفاصيل الطلب النشط"
			subtitle="معلومات تفصيلية لخطوات المسار."
			heroTitle="طلب # 28401"
			heroDescription="استعرض تفاصيل المهمة والجهات والتحصيل COD."
			primaryLabel="العودة"
			secondaryLabel="فتح دردشة الدعم"
			onBack={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function DshCaptainOrdersOffersListScreen({
	onBack,
	onSecondaryAction,
}: {
	onBack?: () => void;
	onSecondaryAction?: () => void;
}) {
	return (
		<SimpleSupportScreen
			title="عروض التوصيل المتاحة"
			subtitle="راجع قائمة العروض والمسافات المقترحة."
			heroTitle="عروض الطلبات"
			heroDescription="يظهر العرض المفتوح نقطة البداية نفسها المستخدمة في تطبيق العميل."
			primaryLabel="تحديث العروض"
			secondaryLabel="العودة"
			onBack={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function DshCaptainProofUploadScreen({
	orderId = 'ORD-9021',
	status,
	onBack,
	onSecondaryAction,
	onActionPress,
}: {
	orderId?: string;
	status?: DshCaptainOrderProofStatus;
	onBack?: () => void;
	onSecondaryAction?: () => void;
	onActionPress?: (action: DshCaptainOrderAction) => void;
}) {
	return (
		<DshOperationScreen
			state="ready"
			title="إثبات التسليم (PoD)"
			subtitle={`التقط صورة واضحة للشحنة عند موقع التسليم للطلب #${orderId}.`}
			content={
				<Box gap={4}>
					<OrderProofSection status={status} onActionPress={onActionPress} />
				</Box>
			}
			primaryActionLabel={onBack ? 'العودة' : undefined}
			secondaryActionLabel={onSecondaryAction ? 'تفاصيل المهمة' : undefined}
			onPrimaryAction={onBack}
			onSecondaryAction={onSecondaryAction}
		/>
	);
}

export function CaptainPickupConfirmSheet({
	visible,
	orderTitle,
	state = 'ready',
	onConfirm,
	onCancel,
}: {
	visible: boolean;
	orderTitle: string;
	state?: 'ready' | 'loading' | 'success' | 'error';
	onConfirm: () => void;
	onCancel: () => void;
}) {
	if (!visible) {
		return null;
	}

	return (
		<SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
			{state === 'loading' ? (
				<StateView tone="info" loading title="جاري تأكيد الاستلام..." description="" />
			) : state === 'success' ? (
				<StateView tone="success" title="تم الاستلام بنجاح" description="تم تحديث حالة الطلب إلى مستلم." actionLabel="موافق" onActionPress={onConfirm} />
			) : state === 'error' ? (
				<StateView tone="danger" title="فشل تأكيد الاستلام" description="حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً." actionLabel="إغلاق" onActionPress={onCancel} />
			) : (
				<>
					<SectionHeader title="تأكيد الاستلام" subtitle="أقر باستلام الطلب قبل نقله إلى المرحلة التالية." />
					<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{orderTitle}</Text>
					<Box gap={2}>
						<Button label="تأكيد الاستلام" onPress={onConfirm} />
						<Button label="إلغاء" tone="ghost" onPress={onCancel} />
					</Box>
				</>
			)}
		</SurfaceAny>
	);
}

export function CaptainDeliveryConfirmSheet({ visible, orderTitle, onConfirm, onCancel }: { visible: boolean; orderTitle: string; onConfirm: () => void; onCancel: () => void; }) {
	if (!visible) {
		return null;
	}

	return (
		<SurfaceAny tone="raised" padding={4} gap={3} radiusToken="xl">
			<SectionHeader title="تأكيد التسليم" subtitle="أغلق الطلب بعد استلام العميل له." />
			<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{orderTitle}</Text>
			<Box gap={2}>
				<Button label="تأكيد التسليم" onPress={onConfirm} />
				<Button label="إلغاء" tone="ghost" onPress={onCancel} />
			</Box>
		</SurfaceAny>
	);
}

export function DshCaptainOrderChatScreen({
	orderId,
	pickupLabel,
	dropoffLabel,
	state = 'active',
}: {
	orderId: string;
	pickupLabel: string;
	dropoffLabel: string;
	state?: 'active' | 'readOnly';
}) {
	return <OrderChatSection orderId={orderId} pickupLabel={pickupLabel} dropoffLabel={dropoffLabel} state={state} />;
}

export function DshCaptainBellScreen({
	state,
	items,
	onOpenInbox,
	onOpenNextOrder,
	onRetry,
	onBack,
}: {
	state?: 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'disabled';
	summary?: {
		inboxLabel: string;
		approvalLabel: string;
		urgentLabel: string;
		nextActionLabel: string;
	};
	items?: DshCaptainOrderBellItem[];
	onOpenInbox?: () => void;
	onOpenNextOrder?: () => void;
	onRetry?: () => void;
	onBack?: () => void;
}) {
	if (state && state !== 'ready') {
		const stateProps = {
			loading: { tone: 'info' as const, loading: true, title: 'جارٍ تجهيز جرس الكابتن', description: 'ستظهر رنّة الطلب التالية بمجرد وصول بيانات الصف.', actionLabel: 'إعادة المحاولة' },
			empty: { tone: 'neutral' as const, title: 'لا توجد رنات طلب جديدة', description: 'يبقى الجرس هادئًا حتى يصل طلب جديد إلى الصف.', actionLabel: 'فتح الصندوق' },
			offline: { tone: 'warning' as const, title: 'جرس الكابتن غير متصل', description: 'أعد الاتصال لاسترجاع مسار التنبيه المباشر للطلبات الجديدة.', actionLabel: 'إعادة المحاولة' },
			disabled: { tone: 'warning' as const, title: 'جرس الكابتن متوقف', description: 'يمكن إبقاء الجرس للقراءة فقط حتى يعاد تفعيل صف DSH.', actionLabel: 'فتح الصندوق' },
			error: { tone: 'danger' as const, title: 'تعذر تحميل جرس الكابتن', description: 'أعد تحميل المسار نفسه مع إبقاء صف التنبيه ظاهرًا.', actionLabel: 'إعادة المحاولة' },
			ready: null,
		}[state];

		if (!stateProps) {
			return null;
		}

		return (
			<MobileScrollView padding={4} gap={4}>
				<StateView {...stateProps} onActionPress={onRetry ?? onOpenInbox ?? onBack} />
			</MobileScrollView>
		);
	}

	return (
		<OrderBellSection
			items={items}
			onOpenInbox={onOpenInbox}
			onOpenNextOrder={onOpenNextOrder}
			onRetry={onRetry}
			onBack={onBack}
		/>
	);
}

export function CaptainOrdersInboxScreen(props: Pick<DshCaptainOrdersScreenProps, 'state' | 'items' | 'onOpenOrder' | 'onOpenNextOrder' | 'onRetry'> = {}) {
	return <DshCaptainOrdersScreen {...props} section="inbox" />;
}

export function CaptainOrderDetailScreen({
	summary,
	onConfirmPickup,
	onConfirmDelivery,
	onOpenNextOrder,
	onBackToInbox,
	onRetry,
}: {
	summary?: DshCaptainOrderDetailSummary;
	onConfirmPickup?: () => void;
	onConfirmDelivery?: () => void;
	onOpenNextOrder?: () => void;
	onBackToInbox?: () => void;
	onRetry?: () => void;
}) {
	return (
		<OrderDetailSection
			summary={summary}
			onConfirmPickup={onConfirmPickup}
			onConfirmDelivery={onConfirmDelivery}
			onOpenNextOrder={onOpenNextOrder}
			onBackToInbox={onBackToInbox}
			onRetry={onRetry}
		/>
	);
}

// export default DshCaptainOrdersScreen; // Unused default export
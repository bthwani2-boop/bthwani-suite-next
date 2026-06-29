import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Box, Button, Divider, Icon, KeyValueList, lightThemeColors, MobileScrollView, Text, TextField,
  spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type { DshCaptainOrderStage } from '../../shared/orders';
import type { DshCaptainProfileSnapshot } from '../dsh-captain.types';
import { getOperationsSupportFlowsForSurface, type DshOperationsSupportFlowId } from '../../shared';
import { type DshCaptainRegistryFlowId } from '../dsh-captain-binding.contracts';
import { WltDshCaptainBridge } from '../../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_captain.facade';

export type CaptainSupportScreenId =
	| 'chat-read-ack'
	| 'chat-send'
	| 'cod-liability'
	| 'order-accept'
	| 'order-deliver'
	| 'order-details'
	| 'order-get'
	| 'order-pickup'
	| 'orders-list'
	| 'orders-offers-list'
	| 'profile-get'
	| 'proof-upload'
	| 'tier-evaluate'
	| 'tier-info'
	| 'map';

function SimpleSupportScreen({
	title,
	subtitle,
	heroTitle,
	heroDescription,
	primaryLabel,
	secondaryLabel,
	keyValues,
	listItems,
	inputLabel,
	inputHint,
	onPrimaryAction,
	onSecondaryAction,
	onBack,
}: {
	title: string;
	subtitle: string;
	heroTitle: string;
	heroDescription: string;
	primaryLabel: string;
	secondaryLabel?: string;
	keyValues?: Array<{ label: string; value: string; tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info' }> | undefined;
	listItems?: Array<{ title: string; subtitle: string; meta: string; badgeLabel?: string }>;
	inputLabel?: string;
	inputHint?: string | undefined;
	onPrimaryAction?: (() => void) | undefined;
	onSecondaryAction?: (() => void) | undefined;
	onBack?: (() => void) | undefined;
}) {
	const [draftValue, setDraftValue] = React.useState('');
	const theme = lightThemeColors;

	return (
		<DshOperationScreen
			title={title}
			subtitle={subtitle}
			content={
				<Box gap={4}>
					<Box gap={2}>
						<Text role="bodyStrong">{heroTitle}</Text>
						<Text role="bodySm" tone="muted">{heroDescription}</Text>
					</Box>

					{keyValues?.length ? (
						<>
							<Divider />
							<KeyValueList items={keyValues} />
						</>
					) : null}

					{listItems?.length ? (
						<>
							<Divider />
							<Box padding={0} gap={0}>
								{listItems.map((item, index, arr) => (
									<View
										key={`${title}-${item.title}`}
										style={{
											paddingHorizontal: 0,
											paddingVertical: spacing[3],
											borderBottomWidth: index === arr.length - 1 ? 0 : 1,
											borderBottomColor: theme.borderColor,
											gap: spacing[1],
										}}
									>
										<Box layoutDirection="row" justify="space-between" align="center" style={{ flexDirection: 'row-reverse' }}>
											<Text role="bodyStrong" style={{ textAlign: 'right' }}>{item.title}</Text>
											{item.badgeLabel ? <Badge label={item.badgeLabel} tone="action" /> : null}
										</Box>
										<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{item.subtitle}</Text>
										<Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{item.meta}</Text>
									</View>
								))}
							</Box>
						</>
					) : null}

					{inputLabel ? (
						<>
							<Divider />
							<TextField
								label={inputLabel}
								value={draftValue}
								onChangeText={setDraftValue}
								{...(inputHint ? { hint: inputHint } : {})}
							/>
						</>
					) : null}
				</Box>
			}
			primaryActionLabel={primaryLabel}
			secondaryActionLabel={secondaryLabel ?? (onBack ? 'العودة' : undefined)}
			onPrimaryAction={onPrimaryAction}
			onSecondaryAction={onSecondaryAction ?? onBack}
		/>
	);
}

export function DshCaptainChatReadAckScreen(props: { onBack?: () => void; onSecondaryAction?: () => void }) {
	return (
		<SimpleSupportScreen
			title="تأكيد قراءة دردشة الكابتن"
			subtitle="أكد أحدث محادثة تشغيلية من دون مغادرة مسار الطلب النشط."
			heroTitle="الرسائل التشغيلية غير المقروءة"
			heroDescription="يمسح الكابتن التواصل غير المقروء مع البقاء مركزًا على خطوة المسار التالية."
			primaryLabel="وضع علامة مقروء"
			secondaryLabel="العودة إلى دليل الدعم"
			listItems={[
				{ title: 'الفرع', subtitle: 'الطلب جاهز عند الكاونتر 2.', meta: 'منذ دقيقتين', badgeLabel: 'غير مقروء' },
				{ title: 'العميل', subtitle: 'يرجى الاتصال عند الوصول.', meta: 'منذ 5 دقائق', badgeLabel: 'غير مقروء' },
			]}
			onBack={props.onBack}
			onSecondaryAction={props.onSecondaryAction}
		/>
	);
}

export function DshCaptainChatSendScreen(props: { onBack?: () => void; onSecondaryAction?: () => void }) {
	return (
		<SimpleSupportScreen
			title="إرسال رسالة الكابتن"
			subtitle="أرسل رسالة مرتبطة بالمسار من مساحة كتابة مركزة."
			heroTitle="التواصل على المسار"
			heroDescription="استخدم رسالة قصيرة واحدة حتى يتمكن الطرف المستلم من التصرف فورًا."
			primaryLabel="إرسال الرسالة"
			secondaryLabel="العودة إلى دليل الدعم"
			inputLabel="الرسالة"
			inputHint="مثال: وصلت إلى بوابة الاستلام وأنتظر التسليم."
			onBack={props.onBack}
			onSecondaryAction={props.onSecondaryAction}
		/>
	);
}

const CAPTAIN_PROFILE_PREVIEW: DshCaptainProfileSnapshot = {
	displayName: 'عادل اليماني (كابتن)',
	tierLabel: 'كابتن بلاتيني · Elite',
	readinessLabel: 'جاهز ونشط · تتبع الموقع GPS مفعّل',
};

const ACTIVE_ORDER_PREVIEW = {
	id: 'ORD-9021',
	pickupLabel: 'مطعم حضرموت السعيد - شارع الستين',
	dropoffLabel: 'حي حدة - خلف مركز بابل الطبي',
	etaLabel: '15 دقيقة',
	currentStageLabel: 'في الطريق للاستلام',
	stage: 'offer-accepted' as DshCaptainOrderStage,
};

const CAPTAIN_OPERATIONAL_SUPPORT_ITEMS = [
	{ title: 'العميل لا يجيب', subtitle: 'العميل لا يرد على المكالمات أو الرسائل بعد محاولات متكررة.', badgeLabel: 'يتطلب قرارًا', flowId: 'customer_unreachable', screenId: 'chat-read-ack' as const },
	{ title: 'فشل الاستلام من الشريك', subtitle: 'المتجر مغلق، أو الطلب غير متوفر، أو تم رفض التسليم للكابتن.', badgeLabel: 'حرج', flowId: 'pickup_failed', screenId: 'proof-upload' as const },
	{ title: 'مشكلة في موقع العميل', subtitle: 'العنوان المسجل غير دقيق أو خارج نطاق التوصيل المحدد للكابتن.', badgeLabel: 'دعم فني', flowId: 'address_issue', screenId: 'map' as const },
	{ title: 'نزاع مالي على تحصيل COD', subtitle: 'العميل يرفض دفع المبلغ بالكامل أو يدعي الدفع المسبق.', badgeLabel: 'مالية', flowId: 'cod_dispute', screenId: 'cod-liability' as const },
];

const EXECUTION_ITEMS = [
	{ id: 'orders-offers-list' as const, title: 'عروض الطلبات', subtitle: 'قائمة الطلبات الجديدة المقترحة للكابتن بقيم التسعير والمسافة.', badgeLabel: 'مباشر' },
	{ id: 'orders-list' as const, title: 'الطلبات النشطة', subtitle: 'تفاصيل مسار التوصيل الحالي، الاستلام والتسليم النشط.', badgeLabel: 'مباشر' },
	{ id: 'profile-get' as const, title: 'تفاصيل الملف', subtitle: 'الملف الشخصي، تقييم الطبقة ومقاييس الأداء الأسبوعية.', badgeLabel: 'ذاتي' },
	{ id: 'cod-liability' as const, title: 'ذمة COD والمالية', subtitle: 'تتبع المبالغ النقدية المحصلة ومستحقات التسوية المالية.', badgeLabel: 'مالية' },
];

export type DshCaptainOperationsScreenProps = {
	screenId?: CaptainSupportScreenId;
	onBack?: () => void;
	onOpenScreen?: (id: CaptainSupportScreenId) => void;
	onExecuteFlow?: (id: DshCaptainRegistryFlowId) => void;
	onExecuteSupportFlow?: (id: DshOperationsSupportFlowId) => void;
};

export function DshCaptainOperationsScreen({
	screenId,
	onBack,
	onOpenScreen,
	onExecuteFlow,
	onExecuteSupportFlow,
}: DshCaptainOperationsScreenProps) {
	if (screenId === 'profile-get') {
		return (
			<SimpleSupportScreen
				title="ملف الكابتن"
				subtitle="تفاصيل الحساب والأداء"
				heroTitle={CAPTAIN_PROFILE_PREVIEW.displayName}
				heroDescription={CAPTAIN_PROFILE_PREVIEW.readinessLabel}
				keyValues={[
					{ label: 'الاسم', value: 'عادل اليماني' },
					{ label: 'المستوى', value: 'بلاتيني · Elite', tone: 'success' },
					{ label: 'رقم الهاتف', value: '+967 777 123 456' },
					{ label: 'حالة الحساب', value: 'نشط ومؤهل لاستقبال العروض', tone: 'success' },
				]}
				primaryLabel="تحديث البيانات"
				onPrimaryAction={() => onExecuteFlow?.('captain.dsh.profile.update' as any)}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'tier-info') {
		return (
			<SimpleSupportScreen
				title="مزايا الطبقة"
				subtitle="تفاصيل مستوى الأداء"
				heroTitle="الطبقة البلاتينية · Elite"
				heroDescription="أعلى فئة كباتن مع نسبة أرباح إضافية وأولوية تعيين ممتازة."
				keyValues={[
					{ label: 'عمولة التوصيل الأساسية', value: '100% للكابتن' },
					{ label: 'مكافأة إضافية', value: '+8% على كل طلب مكتمل', tone: 'success' },
					{ label: 'مستوى التقييم الحالي', value: '4.92 / 5.00', tone: 'success' },
				]}
				primaryLabel="عرض شروط التقييم"
				onPrimaryAction={() => onOpenScreen?.('tier-evaluate')}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'tier-evaluate') {
		return (
			<SimpleSupportScreen
				title="تقييم الأداء والترقية"
				subtitle="مراجعة معمعايير الانتقال للطبقة التالية"
				heroTitle="شروط الترقية المتبقية"
				heroDescription="تحتاج إلى 12 طلبًا إضافيًا مكتملًا هذا الشهر للحفاظ على المستوى البلاتيني."
				listItems={[
					{ title: 'الطلبات المكتملة', subtitle: 'تم إكمال 108 من أصل 120 طلبًا مطلوبًا.', meta: 'متبقي 12 طلبًا' },
					{ title: 'نسبة قبول العروض', subtitle: 'نسبة القبول الحالية 96% (الحد الأدنى 90%).', meta: 'مستوفى', badgeLabel: 'مستوفى' },
					{ title: 'التقييم العام', subtitle: 'تقييمك الحالي 4.92 (الحد الأدنى 4.80).', meta: 'مستوفى', badgeLabel: 'مستوفى' },
				]}
				primaryLabel="طلب مراجعة الأداء"
				onPrimaryAction={() => onExecuteFlow?.('captain.dsh.tier.reevaluate' as any)}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'orders-offers-list') {
		return (
			<SimpleSupportScreen
				title="عروض الطلبات"
				subtitle="العروض المتاحة حاليًا للتوصيل"
				heroTitle="لا توجد عروض جديدة"
				heroDescription="سيتم تنبيهك فور توفر طلب توصيل مناسب في منطقتك الحالية."
				primaryLabel="تحديث القائمة"
				onPrimaryAction={() => onExecuteFlow?.('captain.dsh.orders.get' as any)}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'orders-list') {
		return (
			<SimpleSupportScreen
				title="الطلبات النشطة"
				subtitle="المهام الجاري تنفيذها حاليًا"
				heroTitle="الطلب النشط الحالي"
				heroDescription="مهمة توصيل واحدة قيد التنفيذ."
				keyValues={[
					{ label: 'رقم الطلب', value: '# 28401', tone: 'brand' },
					{ label: 'المتجر', value: 'مطعم حضرموت السعيد' },
					{ label: 'العميل', value: 'أحمد علي حدة' },
					{ label: 'حالة الاستلام', value: 'في الطريق للاستلام', tone: 'warning' },
				]}
				primaryLabel="تفاصيل الاستلام والتسليم"
				onPrimaryAction={() => onOpenScreen?.('order-pickup')}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'order-get') {
		return (
			<SimpleSupportScreen
				title="لقطة تفاصيل الطلب"
				subtitle="معلومات تفصيلية للمهمة النشطة"
				heroTitle="طلب # 28401"
				heroDescription="تم التعيين والقبول · في انتظار الاستلام من المتجر."
				keyValues={[
					{ label: 'المتجر', value: 'مطعم حضرموت السعيد - الستين' },
					{ label: 'مسافة الاستلام', value: '1.8 كم' },
					{ label: 'مسافة التسليم للعميل', value: '3.5 كم' },
					{ label: 'طريقة الدفع', value: 'نقد عند الاستلام COD', tone: 'warning' },
					{ label: 'إجمالي الحساب المحصّل', value: '4,500 ر.ي' },
					{ label: 'أرباح الكابتن المتوقعة', value: '850 ر.ي', tone: 'success' },
				]}
				primaryLabel="بدء التوجيه GPS للمتجر"
				onPrimaryAction={() => onOpenScreen?.('map')}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'order-pickup') {
		return (
			<SimpleSupportScreen
				title="استلام الشحنة من المتجر"
				subtitle="خطوة تأكيد استلام الطلب من الشريك"
				heroTitle="تأكيد الاستلام"
				heroDescription="يرجى مطابقة محتويات الطلب ورقم الفاتورة قبل الاستلام."
				keyValues={[
					{ label: 'رقم الفاتورة المطلوبة', value: '# 28401', tone: 'brand' },
					{ label: 'محتويات الطلب', value: 'وجبة غداء عائلية + مشروبات' },
					{ label: 'تعليمات الشريك للتحضير', value: 'يرجى وضع الكيس في الصندوق الحراري مباشرة.' },
				]}
				primaryLabel="تأكيد استلام الطلب بنجاح"
				onPrimaryAction={() => onExecuteFlow?.('captain.dsh.order.pickup' as any)}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'order-deliver') {
		return (
			<SimpleSupportScreen
				title="تسليم الشحنة للعميل"
				subtitle="خطوة إغلاق الطلب وتأكيد التسليم"
				heroTitle="تأكيد تسليم الطلب"
				heroDescription="وصلت لموقع العميل · يرجى تحصيل المبلغ المالي وتأكيد التسليم."
				keyValues={[
					{ label: 'اسم العميل', value: 'أحمد علي حدة' },
					{ label: 'المبلغ المطلوب تحصيله (COD)', value: '4,500 ر.ي', tone: 'warning' },
					{ label: 'إثبات التسليم مطلوب', value: 'التقاط صورة عند باب العميل', tone: 'brand' },
				]}
				primaryLabel="التقاط إثبات التسليم (PoD)"
				onPrimaryAction={() => onOpenScreen?.('proof-upload')}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'proof-upload') {
		return (
			<SimpleSupportScreen
				title="التقاط إثبات التسليم (PoD)"
				subtitle="توثيق تسليم الشحنة للعميل"
				heroTitle="إرفاق صورة إثبات التسليم"
				heroDescription="التقط صورة واضحة تظهر الطلب عند موقع العميل أو مع المستلم."
				primaryLabel="التقاط صورة باستخدام الكاميرا"
				onPrimaryAction={() => onExecuteFlow?.('captain.dsh.proof.upload' as any)}
				onBack={onBack}
			/>
		);
	}

	if (screenId === 'chat-read-ack') {
		return (
			<DshCaptainChatReadAckScreen {...(onBack ? { onBack, onSecondaryAction: onBack } : {})} />
		);
	}

	if (screenId === 'chat-send') {
		return (
			<DshCaptainChatSendScreen {...(onBack ? { onBack, onSecondaryAction: onBack } : {})} />
		);
	}

	if (screenId === 'cod-liability') {
		return (
			<WltDshCaptainBridge section="cod-liability" {...(onBack ? { onBack } : {})} />
		);
	}

	if (screenId === 'map') {
		return (
			<SimpleSupportScreen
				title="خريطة التوجيه والتتبع"
				subtitle="تحديد مسار الحركة بالـ GPS"
				heroTitle="خريطة التتبع المباشر"
				heroDescription="موقع الكابتن وموقع العميل يظهران تزامنيًا لتسهيل الوصول."
				keyValues={[
					{ label: 'الموقع الحالي الكابتن', value: 'صنعاء - شارع الستين الغربي' },
					{ label: 'موقع تسليم العميل', value: 'حي حدة - خلف مركز بابل الطبي' },
					{ label: 'المسافة المتبقية', value: '1.2 كم (حوالي 4 دقائق)', tone: 'info' },
				]}
				primaryLabel="محاكاة تحديث موقع الـ GPS"
				onPrimaryAction={() => onExecuteFlow?.('captain.dsh.map.refresh' as any)}
				onBack={onBack}
			/>
		);
	}

	return (
		<DshOperationScreen
			title="الدعم والعمليات الميدانية"
			subtitle="صندوق أدوات الكابتن لمعالجة الاستثناءات ومشاكل التسليم في الميدان."
			content={
				<DshCaptainOperationsLayout
					onOpenScreen={onOpenScreen as any}
					onExecuteSupportFlow={onExecuteSupportFlow as any}
				/>
			}
			primaryActionLabel={onBack ? 'العودة' : undefined}
			onPrimaryAction={onBack}
		/>
	);
}

export function DshCaptainSupportDirectoryScreen({ onOpenScreen }: { onOpenScreen?: (screenId: CaptainSupportScreenId) => void }) {
	return <DshCaptainOperationsScreen onOpenScreen={onOpenScreen as any} />;
}

export function DshCaptainOperationsLayout({
	onOpenScreen,
	onExecuteSupportFlow,
}: {
	onOpenScreen?: (id: CaptainSupportScreenId) => void;
	onExecuteSupportFlow?: (id: DshOperationsSupportFlowId) => void;
}) {
	const currentActionScreenId = (ACTIVE_ORDER_PREVIEW.stage as any) === 'offer-accepted' ? 'order-pickup' : 'order-deliver';

	const FlatSection = ({ label, children }: { label: string; children: React.ReactNode }) => {
		const theme = lightThemeColors;
		return (
			<Box padding={0} gap={0}>
				<Text
					role="label"
					tone="muted"
					style={{ paddingBottom: spacing[2], textAlign: 'right', color: theme.colorMuted }}
				>
					{label}
				</Text>
				{children}
			</Box>
		);
	};

	const FlatRow = ({ title, subtitle, badgeLabel, badgeTone, isLast, onPress }: { title: string; subtitle: string; badgeLabel?: string; badgeTone?: 'default' | 'brand' | 'success' | 'warning' | 'danger'; isLast: boolean; onPress: () => void }) => {
		const theme = lightThemeColors;
		return (
			<Pressable
				onPress={onPress}
				style={({ pressed }) => ({
					flexDirection: 'row-reverse',
					alignItems: 'center',
					justifyContent: 'space-between',
					paddingVertical: 14,
					paddingHorizontal: 0,
					borderBottomWidth: isLast ? 0 : 1,
					borderBottomColor: theme.borderColor,
					backgroundColor: pressed ? theme.surfaceInset : 'transparent',
				})}
			>
				<View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
					<Box layoutDirection="row" gap={2} style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
						<Text role="bodyStrong" style={{ color: theme.color }}>{title}</Text>
						{badgeLabel ? <Badge label={badgeLabel} tone={(badgeTone === 'brand' ? 'action' : badgeTone === 'default' ? 'neutral' : badgeTone) as any} /> : null}
					</Box>
					<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{subtitle}</Text>
				</View>
				<Icon name="chevron-left" tone="muted" size={18} />
			</Pressable>
		);
	};

	return (
		<MobileScrollView padding={4} gap={6} contentContainerStyle={{ paddingBottom: spacing[10] }}>
			{/* ─── Active mission summary ──────────────────────────────── */}
			<Box gap={3}>
				<Box gap={1}>
					<Text role="bodyStrong" style={{ textAlign: 'right' }}>
						{CAPTAIN_PROFILE_PREVIEW.displayName} · {CAPTAIN_PROFILE_PREVIEW.tierLabel}
					</Text>
					<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
						{CAPTAIN_PROFILE_PREVIEW.readinessLabel}
					</Text>
				</Box>
				<KeyValueList
					items={[
						{ label: 'الاستلام', value: ACTIVE_ORDER_PREVIEW.pickupLabel },
						{ label: 'التسليم', value: ACTIVE_ORDER_PREVIEW.dropoffLabel },
						{ label: 'ETA', value: ACTIVE_ORDER_PREVIEW.etaLabel, tone: 'info' },
						{ label: 'المرحلة', value: ACTIVE_ORDER_PREVIEW.currentStageLabel, tone: 'brand' },
					]}
				/>
				<Box gap={2}>
					<Button label={resolvePrimaryActionLabel(ACTIVE_ORDER_PREVIEW.stage)} onPress={() => onOpenScreen?.(currentActionScreenId)} />
					<Button label="لقطة الطلب" tone="secondary" onPress={() => onOpenScreen?.('order-get')} />
				</Box>
			</Box>

			<Divider />

			{/* ─── خطوات التنفيذ الفوري ──────────────────────────────── */}
			<FlatSection label="خطوات التنفيذ الفوري">
				{EXECUTION_ITEMS.map((item, index, arr) => (
					<FlatRow
						key={item.id}
						title={item.title}
						subtitle={item.subtitle}
						badgeLabel={item.badgeLabel}
						isLast={index === arr.length - 1}
						onPress={() => onOpenScreen?.(item.id)}
					/>
				))}
			</FlatSection>

			<Divider />

			{/* ─── مشاكل شائعة في الميدان ──────────────────────────────── */}
			<FlatSection label="مشاكل شائعة">
				{CAPTAIN_OPERATIONAL_SUPPORT_ITEMS.map((item, index, arr) => (
					<FlatRow
						key={item.flowId}
						title={item.title}
						subtitle={item.subtitle}
						badgeLabel={item.badgeLabel}
						badgeTone={item.badgeLabel === 'حرج' ? 'danger' : item.badgeLabel === 'يتطلب قرارًا' ? 'warning' : 'default'}
						isLast={index === arr.length - 1}
						onPress={() => {
							if (onExecuteSupportFlow) {
								onExecuteSupportFlow(item.flowId as DshOperationsSupportFlowId);
							} else if (onOpenScreen) {
								onOpenScreen(item.screenId);
							}
						}}
					/>
				))}
			</FlatSection>
		</MobileScrollView>
	);
}

function resolvePrimaryActionLabel(stage: any): string {
	switch (stage) {
		case 'offer-accepting':
		case 'offer-accepted':
			return 'استلام الطلب من المتجر';
		default:
			return 'تسليم الطلب للعميل';
	}
}

export default DshCaptainOperationsScreen;

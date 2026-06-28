import React from 'react';
import { ScrollView } from 'react-native';
import {
	Badge,
	Box,
	Button,
	Divider,
	Icon,
	KeyValueList,
	SectionHeader,
	Text,
	TextField,
	useTheme,
	spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type { DshCaptainOrderDetailSummary, DshCaptainOrderMessage } from '../../shared/orders';

export const OrderDetailSection = React.memo(function OrderDetailSection({
	summary,
	onConfirmPickup,
	onConfirmDelivery,
	onOpenNextOrder,
	onBackToInbox,
	onRetry,
}: {
	summary?: DshCaptainOrderDetailSummary | undefined;
	onConfirmPickup?: (() => void) | undefined;
	onConfirmDelivery?: (() => void) | undefined;
	onOpenNextOrder?: (() => void) | undefined;
	onBackToInbox?: (() => void) | undefined;
	onRetry?: (() => void) | undefined;
}) {
	const theme = useTheme() as any;
	const [bellRung, setBellRung] = React.useState(false);
	const [localMessages, setLocalMessages] = React.useState<DshCaptainOrderMessage[]>([]);
	const [draftText, setDraftText] = React.useState('');

	const primaryActionLabel = onConfirmPickup ? 'تأكيد الاستلام' : onConfirmDelivery ? 'تأكيد التسليم' : undefined;
	const primaryAction = onConfirmPickup ?? onConfirmDelivery;
	const secondaryActionLabel = onOpenNextOrder ? 'فتح الطلب التالي' : onRetry ? 'إعادة المحاولة' : undefined;
	const secondaryAction = onOpenNextOrder ?? onRetry;

	return (
		<DshOperationScreen
			title="تفاصيل الطلب"
			subtitle="مهمة نشطة مع تواصل متكامل وجرس تنبيه ذكي مباشر داخل نفس شاشة الطلب."
			content={
				<Box gap={4} style={{ paddingHorizontal: spacing[1] }}>
					<Box gap={3} style={{ paddingVertical: spacing[1] }}>
						<Box gap={1} style={{ alignItems: 'flex-end' }}>
							<Badge label="طلب الكابتن" tone="warning" />
							<Text role="titleLg" style={{ textAlign: 'right' }}>{summary?.orderId ?? ''}</Text>
							<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
								{summary?.currentStageLabel ?? ''}
							</Text>
						</Box>

						<KeyValueList
							items={[
								{ label: 'الاستلام', value: summary?.pickupLabel ?? '', tone: 'brand' },
								{ label: 'التسليم', value: summary?.dropoffLabel ?? '' },
								{ label: 'الوقت المتوقع', value: summary?.etaLabel ?? '', tone: 'warning' },
								{ label: 'الخطوة التالية', value: summary?.nextActionLabel ?? '', tone: 'success' },
							]}
						/>
					</Box>

					<Divider />

					<Box gap={3} style={{ paddingVertical: spacing[1] }}>
						<SectionHeader title="قواعد الالتقاط والتسليم" subtitle="أسباب الرفض والفشل وإثباتات التسليم تبقى إلزامية داخل نفس المسار." />
						<KeyValueList
							items={[
								{ label: 'سبب إجباري', value: 'رفض العرض / فشل الالتقاط / فشل التسليم', tone: 'warning' },
								{ label: 'أزرار الدعم', value: 'الدعم · الجرس · فتح التذكرة', tone: 'brand' },
								{ label: 'PoD states', value: 'idle → required → uploaded', tone: 'success' },
							]}
						/>
					</Box>

					<Divider />

					<Box gap={2} style={{ paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderLeftWidth: 4, borderLeftColor: bellRung ? theme.success : theme.warning }}>
						<Box style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
							<Badge label={bellRung ? 'تم إرسال التنبيه' : 'جرس تنبيه الكابتن'} tone={bellRung ? 'success' : 'warning'} />
							<Icon name="notifications-outline" size={20} tone={bellRung ? 'success' : 'warning'} />
						</Box>
						<Text role="bodySm" tone="muted" style={{ textAlign: 'right', marginTop: spacing[1] }}>
							{bellRung
								? 'تم إرسال رنة جرس تنبيه للكابتن داخل الطلب لتحديث حالة الوصول الفوري بنجاح.'
								: 'يرجى قرع الجرس لإرسال رنة تنبيه فوري للكابتن وتنبيهه للوصول دون الحاجة للاتصال الخارجي.'}
						</Text>
						{!bellRung && (
							<Button
								label="قرع جرس تنبيه الكابتن"
								tone="secondary"
								size="sm"
								fullWidth={false}
								onPress={() => {
									setBellRung(true);
									setLocalMessages(current => [...current, {
										id: `bell-ring-${current.length + 1}`,
										sender: 'النظام',
										text: '🔔 تم قرع جرس تنبيه الكابتن فوريًا وتحديث الحالة بنجاح.',
										time: 'الآن',
										side: 'start',
									}]);
								}}
							/>
						)}
					</Box>

					<Divider />

					<Box gap={3} style={{ paddingVertical: spacing[1] }}>
						<SectionHeader
							title="مراسلة وتواصل الطلب"
							subtitle="دردشة مباشرة ثنائية بين الكابتن والعميل في سياق الطلب."
						/>

						<ScrollView style={{ maxHeight: 220, gap: spacing[2], marginBottom: spacing[2] }}>
							{localMessages.map((msg) => {
								const isEndSide = msg.side === 'end';
								return (
									<Box key={msg.id} style={{ alignSelf: isEndSide ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
										<Box
											background={isEndSide ? 'brand' : 'surface'}
											border={!isEndSide}
											borderTone="line"
											radiusToken="sm"
											style={{ padding: spacing[2] }}
										>
											<Box style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 }}>
												<Badge label={msg.sender} tone={isEndSide ? 'brand' as any : 'default' as any} />
												<Text role="caption" tone={isEndSide ? 'inverse' : 'muted'}>{msg.time}</Text>
											</Box>
											<Text role="bodySm" tone={isEndSide ? 'inverse' : 'default'}>
												{msg.text}
											</Text>
										</Box>
									</Box>
								);
							})}
						</ScrollView>

						<Box gap={2} style={{ borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 10 }}>
							{(() => {
								const TextFieldAny = TextField as any;
								return (
									<TextFieldAny
										value={draftText}
										onChangeText={setDraftText}
										placeholder="اكتب رسالة للكابتن هنا..."
										style={{ minHeight: 44 }}
									/>
								);
							})()}
							<Box style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[1] }}>
								<Button
									size="sm"
									fullWidth={false}
									label="إرسال الرسالة"
									disabled={!draftText.trim()}
									onPress={() => {
										if (!draftText.trim()) return;
										const text = draftText.trim();
										setLocalMessages(current => [...current, {
											id: `msg-${current.length + 1}`,
											sender: 'الكابتن',
											text,
											time: 'الآن',
											side: 'end',
										}]);
										setDraftText('');
									}}
								/>
								<Text role="caption" tone="muted">
									التواصل مشفر ومغلق داخل الطلب.
								</Text>
							</Box>
						</Box>
					</Box>
				</Box>
			}
			primaryActionLabel={primaryActionLabel}
			secondaryActionLabel={secondaryActionLabel}
			tertiaryActionLabel={onBackToInbox ? 'العودة إلى الصندوق' : undefined}
			onPrimaryAction={primaryAction}
			onSecondaryAction={secondaryAction}
			onTertiaryAction={onBackToInbox}
			onRetry={onRetry}
		/>
	);
});

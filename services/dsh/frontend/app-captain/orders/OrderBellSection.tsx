import React from 'react';
import { Pressable, View } from 'react-native';
import {
	Badge,
	Box,
	Button,
	Divider,
	KeyValueList,
	Text,
	useTheme,
	spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type { DshCaptainOrderBellItem } from '../../shared/orders';
import { resolveServiceTypeBadge } from './OrderInboxSection';

export const OrderBellSection = React.memo(function OrderBellSection({
	items = [],
	onOpenInbox,
	onOpenNextOrder,
	onRetry,
	onBack,
}: {
	items?: DshCaptainOrderBellItem[] | undefined;
	onOpenInbox?: (() => void) | undefined;
	onOpenNextOrder?: (() => void) | undefined;
	onRetry?: (() => void) | undefined;
	onBack?: (() => void) | undefined;
}) {
	const theme = useTheme() as any;

	return (
		<DshOperationScreen
			title="جرس الطلبات الجديدة للكابتن"
			subtitle="تنبيه واضح ومختصر يدفع نحو الصندوق أو أول طلب يحتاج قرارًا سريعًا."
			content={
				<Box gap={4} style={{ paddingHorizontal: spacing[1] }}>
					<Box gap={3} style={{ paddingVertical: spacing[1] }}>
						<Box gap={1} style={{ alignItems: 'flex-end' }}>
							<Badge label="طلبات جديدة" tone="warning" />
							<Text role="titleLg" style={{ textAlign: 'right' }}>جرس الطلبات الجديدة للكابتن</Text>
							<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
								هذا الجرس يلفت الانتباه فقط عند وصول طلب جديد أو عند الحاجة إلى موافقة سريعة من الكابتن.
							</Text>
						</Box>

						<Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
							<Box background="surface" border borderTone="line" radiusToken="md" style={{ padding: spacing[3], flex: 1, minWidth: 80, gap: spacing[1] }}>
								<Text role="caption" tone="muted">طلبات جديدة</Text>
								<Text role="titleSm">{String(items.length)}</Text>
							</Box>
						</Box>
					</Box>

					<Divider />

					<KeyValueList
						items={[
							{ label: 'الحالة', value: 'بحاجة إلى موافقة', tone: 'brand' },
							{ label: 'الأولوية', value: 'رنات الطلبات العاجلة', tone: 'warning' },
						]}
					/>

					<Divider />

					<Box padding={0} gap={0}>
						{items.map((item, index, arr) => (
							<Pressable
								key={item.id}
								style={({ pressed }) => ({
									flexDirection: 'row-reverse',
									alignItems: 'flex-start',
									justifyContent: 'space-between',
									paddingVertical: 14,
									backgroundColor: pressed ? theme.surfaceInset : theme.surface,
									borderBottomWidth: index === arr.length - 1 ? 0 : 1,
									borderBottomColor: theme.line,
									gap: spacing[3],
								})}
							>
								<View style={{ flex: 1, gap: 3, alignItems: 'flex-end' }}>
									<Text role="bodyStrong" style={{ textAlign: 'right' }} numberOfLines={1}>{item.title}</Text>
									{item.subtitle ? <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }} numberOfLines={1}>{item.subtitle}</Text> : null}
									{item.meta ? <Text role="caption" tone="muted" style={{ textAlign: 'right' }} numberOfLines={1}>{item.meta}</Text> : null}
								</View>
								{item.serviceType ? <View style={{ paddingTop: 2, flexShrink: 0 }}><Badge label={resolveServiceTypeBadge(item.serviceType).badgeLabel} tone={resolveServiceTypeBadge(item.serviceType).badgeTone as any} /></View> : null}
							</Pressable>
						))}
					</Box>
				</Box>
			}
			primaryActionLabel={onOpenNextOrder ? 'فتح أول طلب' : undefined}
			secondaryActionLabel={onOpenInbox ? 'صندوق الطلبات' : undefined}
			tertiaryActionLabel={onBack ? 'العودة' : onRetry ? 'إعادة المحاولة' : undefined}
			onPrimaryAction={onOpenNextOrder}
			onSecondaryAction={onOpenInbox}
			onTertiaryAction={onBack ?? onRetry}
			onRetry={onRetry}
		/>
	);
});

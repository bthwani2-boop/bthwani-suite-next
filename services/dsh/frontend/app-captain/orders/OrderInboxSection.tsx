import React from 'react';
import { Pressable, View } from 'react-native';
import {
	Badge,
	Box,
	Button,
	MobileScrollView,
	Text,
	useTheme,
	spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type {
	DshCaptainOrderBellItem,
	DshCaptainOrderId,
	DshCaptainOrderServiceType,
} from '../../shared/orders';

type ServiceBadge = { badgeLabel: string; badgeTone: 'warning' | 'info' | 'brand' };

export function resolveServiceTypeBadge(serviceType: DshCaptainOrderServiceType): ServiceBadge {
	if (serviceType === 'awnak') {
		return { badgeLabel: 'عونك', badgeTone: 'info' };
	}
	if (serviceType === 'shein-final-mile') {
		return { badgeLabel: 'SHEIN - تسليم نهائي', badgeTone: 'brand' };
	}
	return { badgeLabel: 'توصيل بثواني', badgeTone: 'warning' };
}

export type OrderInboxSectionProps = {
	items?: DshCaptainOrderBellItem[] | undefined;
	onOpenOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;
	onOpenNextOrder?: ((orderId: DshCaptainOrderId) => void) | undefined;
	onRetry?: (() => void) | undefined;
};

export const OrderInboxSection = React.memo(function OrderInboxSection({
	items = [],
	onOpenOrder,
	onOpenNextOrder,
	onRetry,
}: OrderInboxSectionProps) {
	const nextOrder = items[0];

	const handleOpenNextOrder = () => {
		if (!nextOrder) {
			onRetry?.();
			return;
		}
		if (onOpenNextOrder) {
			onOpenNextOrder(nextOrder.id);
			return;
		}
		onOpenOrder?.(nextOrder.id);
	};

	if (!nextOrder) {
		return <DshOperationScreen state="empty" title="صندوق طلبات الكابتن" subtitle="مسار الصندوق أولًا يبقي الطلب الفوري واضحًا ويزيل ضجيج اللوحة." onRetry={onRetry} />;
	}

	const theme = useTheme() as any;

	return (
		<MobileScrollView padding={4} gap={5} contentContainerStyle={{ paddingBottom: spacing[10] }}>
			<Box gap={2}>
				<Text role="bodyStrong" style={{ textAlign: 'right' }}>{nextOrder.title}</Text>
				<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{nextOrder.subtitle}</Text>
				<Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{nextOrder.meta}</Text>
			</Box>

			<Box gap={2}>
				<Button label="فتح الطلب التالي" onPress={handleOpenNextOrder} />
				{onRetry ? <Button label="تحديث الطلبات" tone="secondary" onPress={onRetry} /> : null}
			</Box>

			{items.length > 1 ? (
				<>
					<Text role="label" tone="muted" style={{ textAlign: 'right', color: theme.textMuted }}>الطلبات في الصف</Text>
					<Box padding={0} gap={0}>
						{items.map((item, index, arr) => {
							const { badgeLabel, badgeTone } = resolveServiceTypeBadge(item.serviceType);
							return (
								<Pressable
									key={item.id}
									onPress={() => onOpenOrder?.(item.id)}
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
										<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }} numberOfLines={1}>{item.subtitle}</Text>
										<Text role="caption" tone="muted" style={{ textAlign: 'right' }} numberOfLines={1}>{item.meta}</Text>
									</View>
									<View style={{ paddingTop: 2, flexShrink: 0 }}>
										<Badge label={badgeLabel} tone={badgeTone as any} />
									</View>
								</Pressable>
							);
						})}
					</Box>
				</>
			) : null}
		</MobileScrollView>
	);
});

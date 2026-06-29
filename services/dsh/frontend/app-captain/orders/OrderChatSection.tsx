import React from 'react';
import { Pressable, View } from 'react-native';
import {
	Badge,
	Box,
	Button,
	Divider,
	Icon,
	Text,
	TextField,
	useTheme,
	borders,
	spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type { DshCaptainOrderId, DshCaptainOrderMessage } from '../../shared/orders';

const ComposerActionButton = React.memo(function ComposerActionButton({
	iconName,
	accessibilityLabel,
	disabled = false,
	onPress,
}: {
	iconName: React.ComponentProps<typeof Icon>['name'];
	accessibilityLabel: string;
	disabled?: boolean;
	onPress?: () => void;
}) {
	const theme = useTheme() as any;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			onPress={onPress}
			hitSlop={8}
			style={({ pressed }) => ({
				width: 42,
				height: 42,
				borderRadius: 21,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: disabled ? theme.disabledSurface : pressed ? theme.surfaceInset : theme.surface,
				borderWidth: borders.hairline,
				borderColor: disabled ? theme.line : theme.lineStrong,
				opacity: disabled ? 0.55 : 1,
			})}
		>
			<Icon name={iconName} size={18} tone={disabled ? 'soft' as any : 'brand' as any} />
		</Pressable>
	);
});

const OrderChatBubble = React.memo(function OrderChatBubble({ message }: { message: DshCaptainOrderMessage }) {
	const isOutbound = message.side === 'end';

	return (
		<Box style={{ alignSelf: isOutbound ? 'flex-end' : 'flex-start', width: '100%', maxWidth: '86%' }}>
			<Box
				background={isOutbound ? 'brand' : 'surface'}
				border={!isOutbound}
				borderTone="line"
				radiusToken="lg"
				style={{
					padding: spacing[3],
					gap: spacing[2],
				}}
			>
				<Box layoutDirection="row" justify="space-between" align="center" gap={2}>
					<Badge label={message.sender} tone={isOutbound ? 'brand' as any : 'default' as any} />
					<Text role="caption" tone={isOutbound ? 'inverse' : 'muted'}>{message.time}</Text>
				</Box>
				<Text role="bodySm" tone={isOutbound ? 'inverse' : 'default'}>
					{message.text}
				</Text>
			</Box>
		</Box>
	);
});

export const OrderChatSection = React.memo(function OrderChatSection({
	orderId,
	pickupLabel,
	dropoffLabel,
	state = 'active',
}: {
	orderId?: DshCaptainOrderId;
	pickupLabel?: string;
	dropoffLabel?: string;
	state?: 'active' | 'readOnly';
}) {
	const isReadOnly = state === 'readOnly';
	const [draft, setDraft] = React.useState('');
	const [attachments, setAttachments] = React.useState<Array<'voice' | 'camera' | 'video' | 'attachment'>>([]);
	const [composerState, setComposerState] = React.useState<'idle' | 'typing' | 'with-attachment' | 'success' | 'error' | 'disabled'>(isReadOnly ? 'disabled' : 'idle');
	const [messages, setMessages] = React.useState<DshCaptainOrderMessage[]>([]);

	const canSend = !isReadOnly && (draft.trim().length > 0 || attachments.length > 0);

	React.useEffect(() => {
		if (isReadOnly) {
			setComposerState('disabled');
			return;
		}
		if (draft.trim().length > 0) {
			setComposerState('typing');
			return;
		}
		if (attachments.length > 0) {
			setComposerState('with-attachment');
			return;
		}
		setComposerState('idle');
	}, [attachments.length, draft, isReadOnly]);

	const toggleAttachment = (kind: 'voice' | 'camera' | 'video' | 'attachment') => {
		if (isReadOnly) return;
		setAttachments((current) => (current.includes(kind)
			? current.filter((item) => item !== kind)
			: [...current, kind]));
	};

	const handleSend = () => {
		if (!canSend) return;
		const text = draft.trim();
		const attachmentsLabel = attachments.length ? ` [مرفقات: ${attachments.join('، ')}]` : '';
		setMessages((current) => [
			...current,
			{
				id: `msg-${current.length + 1}`,
				sender: 'الكابتن',
				text: `${text || 'تم إرسال مرفقات مرتبطة بالطلب'}${attachmentsLabel}`,
				time: 'الآن',
				side: 'end',
				type: 'text',
			},
		]);
		setDraft('');
		setAttachments([]);
		setComposerState('success');
	};

	const composerHint = isReadOnly
		? 'تم تسليم الطلب. التواصل هنا للقراءة فقط.'
		: composerState === 'success'
			? 'تم الإرسال بنجاح.'
			: composerState === 'error'
				? 'تعذر الإرسال. حاول مرة أخرى.'
				: composerState === 'with-attachment'
					? 'المرفقات جاهزة، أضف نصًا اختياريًا ثم أرسل.'
					: 'الرسائل المختصرة فقط داخل هذا المسار.';

	const TextFieldAny = TextField as any;

	return (
		<DshOperationScreen
			title="محادثة الطلب"
			subtitle="تحديثات قصيرة، مرفقات خفيفة، ومتابعة مباشرة من نفس الطلب."
			content={
				<Box gap={3}>
					<Box gap={2}>
						<Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
							<Badge label={`#${orderId}`} tone="action" />
							<Badge label={isReadOnly ? 'مقروء فقط' : 'نشط'} tone={isReadOnly ? 'success' : 'warning'} />
						</Box>
						<Text role="bodySm" tone="muted">
							{pickupLabel} · {dropoffLabel}
						</Text>
					</Box>

					<Box gap={3} style={{ paddingVertical: spacing[1] }}>
						<Box gap={1}>
							<Text role="titleSm">سجل تواصل الطلب</Text>
							<Text role="bodySm" tone="muted">
								تحديثات قصيرة، مرفقات خفيفة، ومتابعة مباشرة من نفس الطلب.
							</Text>
						</Box>

						<Box style={{ maxHeight: 380, gap: spacing[3] }}>
							{messages.map((message) => (
								<OrderChatBubble key={message.id} message={message} />
							))}
						</Box>

						<Divider />

						<Box
							background={isReadOnly ? 'surfaceInset' : 'surface'}
							border
							borderTone="line"
							radiusToken="md"
							style={{
								padding: spacing[3],
								gap: spacing[2],
							}}
						>
							<TextFieldAny
								value={draft}
								onChangeText={setDraft}
								placeholder={isReadOnly ? 'الطلب مغلق الآن' : 'اكتب رسالة مختصرة...'}
								multiline
								numberOfLines={3}
								style={{ minHeight: 92, textAlignVertical: 'top' }}
							/>
							<Box layoutDirection="row" justify="space-between" align="center" style={{ gap: spacing[3], flexWrap: 'wrap' }}>
								<Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
									<ComposerActionButton iconName="mic-outline" accessibilityLabel="رسالة صوتية" disabled={isReadOnly} onPress={() => toggleAttachment('voice')} />
									<ComposerActionButton iconName="camera-outline" accessibilityLabel="التقاط صورة" disabled={isReadOnly} onPress={() => toggleAttachment('camera')} />
									<ComposerActionButton iconName="videocam-outline" accessibilityLabel="التقاط فيديو" disabled={isReadOnly} onPress={() => toggleAttachment('video')} />
									<ComposerActionButton iconName="attach-outline" accessibilityLabel="إرفاق ملف" disabled={isReadOnly} onPress={() => toggleAttachment('attachment')} />
								</Box>
								<Button
									label={isReadOnly ? 'مقفل' : 'إرسال'}
									tone={isReadOnly ? 'secondary' : 'primary'}
									size="sm"
									fullWidth={false}
									disabled={!canSend}
									onPress={handleSend}
								/>
							</Box>
							<Text role="caption" tone="muted">
								{composerHint}
							</Text>
						</Box>
					</Box>
				</Box>
			}
		/>
	);
});
export default OrderChatSection;

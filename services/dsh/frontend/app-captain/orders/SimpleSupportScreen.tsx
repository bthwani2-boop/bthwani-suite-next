import React from 'react';
import { View } from 'react-native';
import {
	Badge,
	Box,
	Button,
	Divider,
	KeyValueList,
	MobileScrollView,
	Text,
	TextField,
	useTheme,
	spacing,
} from '@bthwani/ui-kit';

export type SimpleSupportKeyValue = {
	label: string;
	value: string;
	tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
};

export type SimpleSupportListItem = {
	title: string;
	subtitle: string;
	meta: string;
	badgeLabel?: string;
};

export function SimpleSupportScreen({
	title,
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
	onRetry,
}: {
	title: string;
	subtitle?: string | undefined;
	heroTitle: string;
	heroDescription: string;
	primaryLabel: string;
	secondaryLabel?: string;
	keyValues?: SimpleSupportKeyValue[];
	listItems?: SimpleSupportListItem[];
	inputLabel?: string;
	inputHint?: string;
	onPrimaryAction?: (() => void) | undefined;
	onSecondaryAction?: (() => void) | undefined;
	onBack?: (() => void) | undefined;
	onRetry?: (() => void) | undefined;
}) {
	const theme = useTheme() as any;
	const [draftValue, setDraftValue] = React.useState('');

	return (
		<MobileScrollView padding={4} gap={5} contentContainerStyle={{ paddingBottom: spacing[10] }}>
			<Box gap={2}>
				<Text role="bodyStrong" style={{ textAlign: 'right' }}>{heroTitle}</Text>
				<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{heroDescription}</Text>
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
									flexDirection: 'row-reverse',
									alignItems: 'flex-start',
									justifyContent: 'space-between',
									paddingVertical: spacing[3],
									borderBottomWidth: index === arr.length - 1 ? 0 : 1,
									borderBottomColor: theme.line,
									gap: spacing[3],
								}}
							>
								<View style={{ flex: 1, gap: 3, alignItems: 'flex-end' }}>
									<Text role="bodyStrong" style={{ textAlign: 'right' }}>{item.title}</Text>
									<Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>{item.subtitle}</Text>
									<Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{item.meta}</Text>
								</View>
								{item.badgeLabel ? <View style={{ paddingTop: 2, flexShrink: 0 }}><Badge label={item.badgeLabel} tone="action" /></View> : null}
							</View>
						))}
					</Box>
				</>
			) : null}

			{inputLabel ? (
				<>
					<Divider />
					{(() => {
						const TextFieldAny = TextField as any;
						return (
							<TextFieldAny
								label={inputLabel}
								value={draftValue}
								onChangeText={setDraftValue}
								hint={inputHint || undefined}
							/>
						);
					})()}
				</>
			) : null}

			<Divider />

			<Box gap={2}>
				<Button label={primaryLabel} onPress={onPrimaryAction} />
				{secondaryLabel ? <Button label={secondaryLabel} tone="secondary" onPress={onSecondaryAction ?? onBack} /> : null}
				{onRetry ? <Button label="إعادة المحاولة" tone="ghost" onPress={onRetry} /> : null}
			</Box>
		</MobileScrollView>
	);
}

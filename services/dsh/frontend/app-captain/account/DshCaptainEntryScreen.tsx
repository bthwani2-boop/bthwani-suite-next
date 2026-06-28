import React from 'react';
import {
	Box,
	Button,
	SectionHeader,
	Surface,
	Text,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';

export type DshEntryScreenState = 'ready' | 'loading' | 'empty';

export type DshEntryScreenProps = {
	state?: DshEntryScreenState;
	isAvailable?: boolean;
	onToggleAvailability?: (available: boolean) => void;
	onOpenOffersPress?: () => void;
	onOpenExecutionPress?: () => void;
	onOpenProofCapturePress?: () => void;
};

function renderOffersSection(onOpenOffersPress?: () => void, onOpenExecutionPress?: () => void) {
	return (
		<Surface tone="brand" gap={3}>
			<SectionHeader
				title="مراجعة العروض الواردة"
				subtitle="ابدأ من قائمة عروض الكابتن حتى يصبح قرار الإرسال التالي واضحًا خلال ثوانٍ."
			/>
			<Box gap={2}>
				<Text role="bodySm" tone="default">
					يبقى العرض المفتوح نقطة البداية نفسها المستخدمة في أسلوب تطبيق العميل: عنوان واضح، محتوى قصير، ثم زر إجراء واحد مباشر.
				</Text>
				<Button label="عرض العروض" tone="secondary" onPress={onOpenOffersPress} />
				<Button label="فتح التنفيذ" tone="ghost" onPress={onOpenExecutionPress} />
			</Box>
		</Surface>
	);
}

function renderCompletionSection(onOpenProofCapturePress?: () => void) {
	return (
		<Surface tone="raised" gap={3}>
			<SectionHeader
				title="التنفيذ والإثبات"
				subtitle="يبقى رفع الإثبات بوابة إغلاق واضحة قبل إقفال الطلب بالكامل."
			/>
			<Text role="bodySm" tone="muted">
				يبقى المالية والطبقات والمجموعات غير الحرجة خارج هذا المدخل الأول حتى تظل إجراءات التسليم هي الأساسية.
			</Text>
			<Button label="فتح إثبات التسليم" tone="secondary" onPress={onOpenProofCapturePress} />
		</Surface>
	);
}

export function DshCaptainEntryScreen({
	state = 'ready',
	isAvailable = false,
	onToggleAvailability,
	onOpenOffersPress,
	onOpenExecutionPress,
	onOpenProofCapturePress,
}: DshEntryScreenProps) {
	return (
		<DshOperationScreen
			state={state}
			title="مدخل الكابتن"
			subtitle="مدخل أحادي الغرض لعمليات تسليم app-captain وأول خطوة إرسال بنفس البنية البصرية المستخدمة في تطبيق العميل."
			content={
				<Box gap={3}>
					<Surface tone={isAvailable ? 'success' : 'raised'} gap={2}>
						<Text role="titleSm">{isAvailable ? 'أنت متاح لاستقبال العروض' : 'أنت غير متاح حالياً'}</Text>
						<Button
							label={isAvailable ? 'إيقاف الاستقبال' : 'بدء الاستقبال'}
							tone={isAvailable ? 'danger' : 'primary'}
							onPress={() => onToggleAvailability?.(!isAvailable)}
						/>
					</Surface>
					{renderOffersSection(onOpenOffersPress, onOpenExecutionPress)}
					{renderCompletionSection(onOpenProofCapturePress)}
				</Box>
			}
			primaryActionLabel="فتح العروض"
			secondaryActionLabel="فتح التنفيذ"
			tertiaryActionLabel="فتح إثبات التسليم"
			onPrimaryAction={onOpenOffersPress}
			onSecondaryAction={onOpenExecutionPress}
			onTertiaryAction={onOpenProofCapturePress}
		/>
	);
}

export { DshCaptainEntryScreen as DshEntryScreen };

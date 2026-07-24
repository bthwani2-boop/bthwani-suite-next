import React from 'react';
import {
	Box,
	Button,
	SectionHeader,
	Surface,
	Text,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';

export type DshEntryScreenState = 'ready' | 'loading' | 'empty' | 'error';

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
		<Surface tone="action" gap={3}>
			<SectionHeader
				title="العروض والمهام"
				subtitle="اقرأ عروض DSH الحية فقط، ثم انتقل للتنفيذ عند وجود مهمة مقبولة."
			/>
			<Box gap={2}>
				<Text role="bodySm" tone="default">
					لا تُنشئ هذه الصفحة طلبات أو مهام افتراضية. كل بطاقة تظهر هنا يجب أن تأتي من صندوق الكابتن الحقيقي.
				</Text>
				<Button label="عرض العروض" tone="secondary" onPress={onOpenOffersPress} />
				{onOpenExecutionPress ? (
					<Button label="فتح التنفيذ" tone="ghost" onPress={onOpenExecutionPress} />
				) : null}
			</Box>
		</Surface>
	);
}

function renderCompletionSection(onOpenProofCapturePress?: () => void) {
	if (!onOpenProofCapturePress) return null;
	return (
		<Surface tone="raised" gap={3}>
			<SectionHeader
				title="الإثبات والإغلاق"
				subtitle="يظهر هذا المسار فقط عند وجود مهمة حية تتطلب PoD."
			/>
			<Text role="bodySm" tone="muted">
				إثبات التسليم مرتبط بالمهمة النشطة ولا يستقبل معرفات محلية أو بيانات تجربة.
			</Text>
			<Button label="فتح إثبات التسليم" tone="secondary" onPress={onOpenProofCapturePress} />
		</Surface>
	);
}

function DshCaptainEntryScreen({
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
			subtitle="مدخل أحادي الغرض لعمليات تسليم app-captain."
			content={
				<Box gap={3}>
					<Surface tone={isAvailable ? 'success' : 'raised'} gap={2}>
						<Text role="titleSm">{isAvailable ? 'أنت متاح لاستقبال العروض' : 'أنت غير متاح حالياً'}</Text>
						<Text role="bodySm" tone="muted">
							{isAvailable
								? 'سيستمر التطبيق في قراءة عروض DSH المؤهلة لهويتك.'
								: 'فعّل الاستقبال لإظهار العروض الحية عند توفرها.'}
						</Text>
						<Button
							label={isAvailable ? 'إيقاف الاستقبال' : 'بدء الاستقبال'}
							tone={isAvailable ? 'danger' : 'primary'}
							disabled={!onToggleAvailability}
							onPress={() => onToggleAvailability?.(!isAvailable)}
						/>
					</Surface>
					{renderOffersSection(onOpenOffersPress, onOpenExecutionPress)}
					{renderCompletionSection(onOpenProofCapturePress)}
				</Box>
			}
		/>
	);
}

export { DshCaptainEntryScreen as DshEntryScreen };

import React from 'react';
import { Box, KeyValueList, SectionHeader, Divider,
  spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import type { DshCaptainProfileSnapshot } from '../dsh-captain.types';
import type { DshCaptainProfileScreenState } from '../../shared/delivery';

export type DshCaptainProfileScreenProps = {
	section?: 'profile-get' | 'tier-info' | 'tier-evaluate';
	state?: DshCaptainProfileScreenState;
	snapshot?: DshCaptainProfileSnapshot;
	onBack?: () => void;
	onRetry?: () => void;
};

function ProfileSummarySection({ snapshot }: { snapshot: DshCaptainProfileSnapshot }) {
	return (
		<Box gap={3} style={{ paddingVertical: spacing[1] }}>
			<SectionHeader title="ملف الكابتن" subtitle="اقرأ ملف الكابتن الحالي وحالة الجاهزية للمسار." />
			<KeyValueList
				items={[
					{ label: 'الكابتن', value: snapshot.displayName, tone: 'brand' },
					{ label: 'المستوى', value: snapshot.tierLabel, tone: 'success' },
					{ label: 'الجاهزية', value: snapshot.readinessLabel, tone: 'success' },
				]}
			/>
		</Box>
	);
}

function TierSection({ snapshot, mode }: { snapshot: DshCaptainProfileSnapshot; mode: 'tier-info' | 'tier-evaluate' }) {
	if (mode === 'tier-info') {
		return (
			<Box gap={3} style={{ paddingVertical: spacing[1] }}>
				<SectionHeader title="معلومات الطبقة" subtitle="اقرأ مزايا ومتطلبات الطبقة الحالية." />
				<KeyValueList
					items={[
						{ label: 'الطبقة الحالية', value: snapshot.tierLabel, tone: 'brand' },
						{ label: 'مكافأة الأجر', value: '+8%' },
						{ label: 'عتبة الطبقة التالية', value: '120 مسارًا مكتملًا' },
					]}
				/>
			</Box>
		);
	}

	return (
		<Box gap={3} style={{ paddingVertical: spacing[1] }}>
			<SectionHeader title="تقييم الطبقة" subtitle="راجع ما إذا كان الكابتن جاهزًا للطبقة التالية." />
			<KeyValueList
				items={[
					{ label: 'معدل الإكمال', value: '97%', tone: 'success' },
					{ label: 'معدل الإلغاء', value: '1.2%', tone: 'info' },
					{ label: 'الحوادث', value: '0', tone: 'success' },
				]}
			/>
		</Box>
	);
}

export function DshCaptainProfileScreen({
	section = 'profile-get',
	state,
	snapshot,
	onBack,
	onRetry,
}: DshCaptainProfileScreenProps) {
	const resolvedState = state ?? (snapshot ? 'ready' : 'loading');
	return (
		<DshOperationScreen
			state={resolvedState}
			title="ملف الكابتن"
			subtitle="لقطة موحدة للملف والطبقة والجاهزية بنفس أسلوب العرض المعتمد في تطبيق العميل."
			content={snapshot ? (
				<Box gap={4}>
					<ProfileSummarySection snapshot={snapshot} />
					<Divider />
					{section === 'tier-info' ? <TierSection snapshot={snapshot} mode="tier-info" /> : null}
					{section === 'tier-evaluate' ? <TierSection snapshot={snapshot} mode="tier-evaluate" /> : null}
					{section === 'profile-get' ? <TierSection snapshot={snapshot} mode="tier-info" /> : null}
				</Box>
			) : null}
			primaryActionLabel={onBack ? 'العودة' : undefined}
			secondaryActionLabel={onRetry ? 'إعادة المحاولة' : undefined}
			onPrimaryAction={onBack}
			onSecondaryAction={onRetry}
			onRetry={onRetry}
		/>
	);
}

export function DshCaptainProfileGetScreen(props: Omit<DshCaptainProfileScreenProps, 'section'> = {}) {
	return <DshCaptainProfileScreen {...props} section="profile-get" />;
}

export function DshCaptainTierInfoScreen(props: Omit<DshCaptainProfileScreenProps, 'section'> = {}) {
	return <DshCaptainProfileScreen {...props} section="tier-info" />;
}

export function DshCaptainTierEvaluateScreen(props: Omit<DshCaptainProfileScreenProps, 'section'> = {}) {
	return <DshCaptainProfileScreen {...props} section="tier-evaluate" />;
}

// export default DshCaptainProfileScreen; // Unused default export
import React from 'react';
import { Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import {
	Box,
	Button,
	Divider,
	StateView,
	Text,
	resolveRowDirection,
	useDirection,
	useTheme,
	Chip,
  radius,
  spacing,
  typography,
} from '@bthwani/ui-kit';
import {
	 type DshMediaAsset,
	 type DshMediaApiError,
} from '../../shared/media/dsh-media-api.client';
import { getDshMediaRuntimeClient } from '../../shared';

// RUNTIME_VIOLATION_FIXED: removed DSH_PRODUCT_MEDIA_FIXTURE_KEYS, resolveDshImageSource, Manifest selector.
// TRACKING: RETIRE_DEV_FIXTURES_AFTER_RUNTIME_MEDIA_CLOSURE

export type ProductMediaScreenProps = Readonly<{
	productId: string;
	/** partnerId used for X-Client-Id in dev mode. Required for operator-scoped writes. */
	partnerId?: string;
	onBack?: () => void;
}>;

type ScreenState =
	| 'loading'
	| 'idle'
	| 'picking'
	| 'uploading'
	| 'error'
	| 'offline'
	| 'storage_unavailable'
	| 'disabled';

function buildAuthHeaders(partnerId?: string): Record<string, string> {
	if (!partnerId) return {};
	return { 'X-Client-Id': partnerId, 'X-Actor-Type': 'partner' };
}

function isOfflineError(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as DshMediaApiError).code === 'offline';
}

function isStorageUnavailableError(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as DshMediaApiError).code === 'storage_unavailable';
}

function formatMediaLabel(asset: DshMediaAsset): string {
	const parts: string[] = [];
	if (asset.purpose) parts.push(asset.purpose);
	if (asset.mime_type) parts.push(asset.mime_type);
	if (asset.file_size_bytes) parts.push(`${Math.round(asset.file_size_bytes / 1024)} KB`);
	return parts.join(' · ');
}

export function ProductMediaScreen({ productId, partnerId, onBack }: ProductMediaScreenProps) {
	const { direction } = useDirection();
	const theme = useTheme() as any;

	const client = React.useMemo(() => getDshMediaRuntimeClient(), []);

	const [screenState, setScreenState] = React.useState<ScreenState>('loading');
	const [assets, setAssets] = React.useState<DshMediaAsset[]>([]);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = React.useState<number>(0);

	const authHeaders = React.useMemo(() => buildAuthHeaders(partnerId), [partnerId]);

	const loadAssets = React.useCallback(async () => {
		if (!client) {
			setScreenState('disabled');
			return;
		}
		setScreenState('loading');
		setErrorMessage(null);
		try {
			const resp = await client.listMedia({ owner_type: 'product', owner_id: productId });
			setAssets(resp.items);
			setScreenState('idle');
		} catch (err) {
			if (isOfflineError(err)) {
				setScreenState('offline');
			} else {
				setErrorMessage('تعذر تحميل وسائط المنتج.');
				setScreenState('error');
			}
		}
	}, [client, productId]);

	React.useEffect(() => {
		loadAssets();
	}, [loadAssets]);

	const handlePickAndUpload = React.useCallback(async () => {
		if (!client) return;

		if (Platform.OS !== 'web') {
			setErrorMessage('رفع الملفات من الجهاز متاح فقط عبر واجهة الويب حالياً. (يتطلب expo-image-picker على الجهاز)');
			setScreenState('error');
			return;
		}

		// Web: use hidden file input
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*,video/*';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;

			setScreenState('uploading');
			setUploadProgress(0);
			setErrorMessage(null);

			try {
				// 1. Create upload intent
				const intentResp = await client.createUploadIntent(
					{
						owner_type: 'product',
						owner_id: productId,
						media_type: file.type.startsWith('video/') ? 'video' : 'image',
						purpose: 'primary',
						filename: file.name,
						mime_type: file.type,
						file_size_bytes: file.size,
					},
					authHeaders,
				);

				setUploadProgress(20);

				// 2. PUT binary to MinIO presigned URL
				await client.putToPresignedUrl(intentResp.intent.upload_url, file, file.type);
				setUploadProgress(80);

				// 3. Complete upload — transitions status pending_upload → uploaded
				await client.completeUpload(intentResp.intent.media_id, {}, authHeaders);
				setUploadProgress(100);

				// 4. Refresh list
				await loadAssets();
			} catch (err) {
				if (isOfflineError(err)) {
					setScreenState('offline');
				} else if (isStorageUnavailableError(err)) {
					setErrorMessage('خدمة تخزين الوسائط غير متاحة حالياً (MinIO). يرجى التأكد من تشغيل الخدمة.');
					setScreenState('storage_unavailable');
				} else {
					setErrorMessage('فشل رفع الصورة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.');
					setScreenState('error');
				}
			}
		};
		input.click();
	}, [client, productId, authHeaders, loadAssets]);

	const handleDelete = React.useCallback(async (mediaId: string) => {
		if (!client) return;
		setErrorMessage(null);
		try {
			await client.deleteMedia(mediaId, authHeaders);
			await loadAssets();
		} catch (err) {
			if (isOfflineError(err)) {
				setScreenState('offline');
			} else {
				setErrorMessage('فشل حذف الوسائط.');
				setScreenState('error');
			}
		}
	}, [client, authHeaders, loadAssets]);

	const isWorking = screenState === 'loading' || screenState === 'uploading';

	if (screenState === 'loading' && assets.length === 0) {
		return <StateView title="جارٍ تحميل وسائط المنتج…" loading />;
	}

	if (screenState === 'offline') {
		return <StateView title="تعذر الاتصال" tone="danger" actionLabel="إعادة المحاولة" onActionPress={loadAssets} />;
	}

	if (screenState === 'disabled' || !client) {
		return <StateView title="واجهة API غير متاحة" description="تحقق من DSH_API_BASE_URL." actionLabel={onBack ? 'رجوع' : undefined} onActionPress={onBack} />;
	}

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{ paddingBottom: 120 }}
			keyboardShouldPersistTaps="handled"
		>
			<Box gap={4} style={{ padding: spacing[4] }}>

				{/* ── Header ── */}
				<Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
					{onBack && (
						<Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
					)}
					<Box style={{ flex: 1, minWidth: 0 }}>
						<Text role="titleSm" align="start">وسائط المنتج</Text>
						<Text role="bodySm" tone="muted" align="start">
							معرف المنتج: {productId}
						</Text>
					</Box>
				</Box>

				{/* ── Error/Storage Banner ── */}
				{!!(errorMessage || screenState === 'storage_unavailable') && (
					<Box
						style={{
							backgroundColor: theme.danger + '15',
							borderRadius: radius.xs,
							padding: spacing[3],
							borderStartWidth: 3,
							borderStartColor: theme.danger,
							gap: spacing[2],
						}}
					>
						<Text role="bodySm" tone="danger" align="start">
							{errorMessage ?? 'خدمة تخزين الوسائط غير متاحة.'}
						</Text>
						<Button label="إعادة المحاولة" tone="secondary" size="sm" fullWidth={false} onPress={loadAssets} />
					</Box>
				)}

				{/* ── Upload Progress ── */}
				{screenState === 'uploading' && (
					<Box
						style={{
							backgroundColor: theme.brand + '12',
							borderRadius: radius.xs,
							padding: spacing[3],
							borderStartWidth: 3,
							borderStartColor: theme.brand,
							gap: spacing[2],
						}}
					>
						<Text role="bodyStrong" tone="action" align="start">جارٍ الرفع… {uploadProgress}%</Text>
						<ActivityIndicator size="small" color={theme.brand} />
					</Box>
				)}

				<Divider />

				{/* ── Media List ── */}
				<Box gap={2}>
					<Text role="bodyStrong" align="start">وسائط المنتج الحالية ({assets.length})</Text>

					{assets.length === 0 ? (
						<Box style={{ padding: spacing[6], borderStyle: 'dashed', borderWidth: 1, borderColor: theme.line, borderRadius: radius.xs, alignItems: 'center' }}>
							<Text role="bodySm" tone="muted" align="center">لا توجد وسائط مرتبطة بهذا المنتج.</Text>
						</Box>
					) : (
						assets.map((asset) => (
							<Box
								key={asset.id}
								style={{
									flexDirection: resolveRowDirection(direction),
									alignItems: 'center',
									justifyContent: 'space-between',
									paddingVertical: spacing[3],
									paddingHorizontal: spacing[1],
									borderBottomWidth: 1,
									borderBottomColor: theme.line,
									gap: spacing[3],
								}}
							>
								<Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3], flex: 1 }}>
									{asset.public_url ? (
										<Image
											source={{ uri: asset.public_url }}
											style={{ width: 64, height: 64, borderRadius: radius.xs, backgroundColor: theme.line + '20' }}
											resizeMode="cover"
										/>
									) : (
										<Box style={{ width: 64, height: 64, borderRadius: radius.xs, backgroundColor: theme.line + '20', justifyContent: 'center', alignItems: 'center' }}>
											<Text role="caption" tone="muted" align="center">{asset.status}</Text>
										</Box>
									)}
									<Box style={{ flex: 1 }}>
										<Text role="bodyStrong" align="start" style={{ fontSize: typography.caption.fontSize }}>{asset.id}</Text>
										<Text role="caption" tone="muted" align="start">{formatMediaLabel(asset)}</Text>
										<Chip label={asset.status ?? "غير محدد"} />
									</Box>
								</Box>

								<Button
									label="حذف"
									tone="danger"
									size="sm"
									fullWidth={false}
									disabled={isWorking}
									onPress={() => handleDelete(asset.id)}
								/>
							</Box>
						))
					)}
				</Box>

				<Divider />

				{/* ── Upload Action ── */}
				<Box gap={2}>
					<Text role="bodyStrong" align="start">رفع وسائط جديدة</Text>
					<Text role="bodySm" tone="muted" align="start">
						{Platform.OS === 'web'
							? 'اختر صورة أو فيديو من جهازك لرفعه مباشرةً إلى خادم الوسائط.'
							: 'رفع الملفات من الجهاز يتطلب expo-image-picker (متاح قريباً).'}
					</Text>

					<Button
						label={screenState === 'uploading' ? `جارٍ الرفع… ${uploadProgress}%` : 'اختر ملف ورفعه'}
						tone="primary"
						disabled={isWorking || Platform.OS !== 'web'}
						onPress={handlePickAndUpload}
						style={{ marginTop: spacing[3] }}
					/>
				</Box>

			</Box>
		</ScrollView>
	);
}

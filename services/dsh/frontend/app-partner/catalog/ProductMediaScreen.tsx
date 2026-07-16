import React from 'react';
import { Platform, ScrollView, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
	/** The store whose assortment row for productId owns the custom image being managed. */
	storeId: string;
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
	return typeof err === 'object' && err !== null && (
		(err as DshMediaApiError).code === 'offline' ||
		(err as { kind?: string }).kind === 'network'
	);
}

function isStorageUnavailableError(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (
		(err as DshMediaApiError).code === 'storage_unavailable' ||
		(err as { status?: number }).status === 503
	);
}

function formatMediaLabel(asset: DshMediaAsset): string {
	const parts: string[] = [];
	if (asset.purpose) parts.push(asset.purpose);
	if (asset.mime_type) parts.push(asset.mime_type);
	if (asset.file_size_bytes) parts.push(`${Math.round(asset.file_size_bytes / 1024)} KB`);
	return parts.join(' · ');
}

export function ProductMediaScreen({ productId, storeId, partnerId, onBack }: ProductMediaScreenProps) {
	const { direction } = useDirection();
	const theme = useTheme() as any;

	const client = React.useMemo(() => getDshMediaRuntimeClient(), []);

	const [screenState, setScreenState] = React.useState<ScreenState>('loading');
	const [assets, setAssets] = React.useState<readonly DshMediaAsset[]>([]);
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
			const resp = await client.listMedia({ owner_type: 'product', owner_id: productId, store_id: storeId });
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
	}, [client, productId, storeId]);

	React.useEffect(() => {
		loadAssets();
	}, [loadAssets]);

	const handlePickAndUpload = React.useCallback(async () => {
		if (!client) return;

		setErrorMessage(null);
		setScreenState('picking');

		try {
			let body: Blob;
			let filename: string;
			let mimeType: string;
			let fileSize: number | undefined;

			if (Platform.OS === 'web') {
				const file = await new Promise<File | null>((resolve) => {
					const input = document.createElement('input');
					let settled = false;
					const finish = (value: File | null) => {
						if (settled) return;
						settled = true;
						window.removeEventListener('focus', handleWindowFocus);
						resolve(value);
					};
					const handleWindowFocus = () => {
						setTimeout(() => finish(input.files?.[0] ?? null), 0);
					};

					input.type = 'file';
					input.accept = 'image/*,video/*';
					input.onchange = () => finish(input.files?.[0] ?? null);
					window.addEventListener('focus', handleWindowFocus, { once: true });
					input.click();
				});

				if (!file) {
					setScreenState('idle');
					return;
				}

				body = file;
				filename = file.name;
				mimeType = file.type || 'application/octet-stream';
				fileSize = file.size;
			} else {
				const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
				if (!permission.granted) {
					throw new Error('يلزم السماح بالوصول إلى معرض الصور لاختيار الوسائط.');
				}

				const result = await ImagePicker.launchImageLibraryAsync({
					mediaTypes: ['images', 'videos'],
					quality: 1,
				});

				if (result.canceled || !result.assets[0]) {
					setScreenState('idle');
					return;
				}

				const asset = result.assets[0];
				body = await client.readLocalUriAsBlob(asset.uri);
				filename = asset.fileName || `product-media-${Date.now()}`;
				mimeType = asset.mimeType || body.type || 'application/octet-stream';
				fileSize = asset.fileSize ?? body.size;
			}

			setScreenState('uploading');
			setUploadProgress(10);

			const intentResp = await client.createUploadIntent(
				{
					owner_type: 'product',
					owner_id: productId,
					store_id: storeId,
					media_type: mimeType.startsWith('video/') ? 'video' : 'image',
					purpose: 'primary',
					filename,
					mime_type: mimeType,
					file_size_bytes: fileSize,
				},
				authHeaders,
			);

			setUploadProgress(25);
			await client.putToPresignedUrl(intentResp.intent.upload_url, body, mimeType);
			setUploadProgress(85);
			await client.completeUpload(intentResp.intent.media_id, { store_id: storeId, product_id: productId }, authHeaders);
			setUploadProgress(100);
			await loadAssets();
		} catch (err) {
			if (isOfflineError(err)) {
				setScreenState('offline');
			} else if (isStorageUnavailableError(err)) {
				setErrorMessage('خدمة تخزين الوسائط غير متاحة حالياً (MinIO).');
				setScreenState('storage_unavailable');
			} else {
				setErrorMessage(err instanceof Error ? err.message : 'فشل رفع الوسائط.');
				setScreenState('error');
			}
		}
	}, [client, productId, storeId, authHeaders, loadAssets]);

	const handleDelete = React.useCallback(async (mediaId: string) => {
		if (!client) return;
		setErrorMessage(null);
		try {
			await client.deleteMedia(mediaId, authHeaders, { store_id: storeId, product_id: productId });
			await loadAssets();
		} catch (err) {
			if (isOfflineError(err)) {
				setScreenState('offline');
			} else {
				setErrorMessage('فشل حذف الوسائط.');
				setScreenState('error');
			}
		}
	}, [client, storeId, productId, authHeaders, loadAssets]);

	const isWorking = screenState === 'loading' || screenState === 'picking' || screenState === 'uploading';

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
											alt=""
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
						اختر صورة أو فيديو من جهازك لرفعه مباشرةً إلى خادم الوسائط.
					</Text>

					<Button
						label={screenState === 'uploading' ? `جارٍ الرفع… ${uploadProgress}%` : 'اختر ملف ورفعه'}
						tone="primary"
						disabled={isWorking}
						onPress={handlePickAndUpload}
						style={{ marginTop: spacing[3] }}
					/>
				</Box>

			</Box>
		</ScrollView>
	);
}

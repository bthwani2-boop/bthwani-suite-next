import { getIdentityAccessToken } from '@bthwani/core-identity';
import { resolveDshApiBaseUrl } from '../../_kernel/dsh-api-base-url';
import { corrId } from '../../_kernel/dsh-http-request';
import { submitCaptainDeliveryProof } from '../../delivery-proof/delivery-proof.api';
import type { DshDeliveryProof } from '../../delivery-proof/delivery-proof.types';

export type CapturedDeliveryProofPhoto = {
  readonly uri: string;
  readonly fileName?: string;
  readonly mimeType?: string;
};

export type CaptainDeliveryEvidenceKind = 'photo' | 'signature';

export type CaptainDeliveryProofSubmission = {
  readonly pin?: string;
  readonly evidenceKind?: CaptainDeliveryEvidenceKind;
  readonly capturedLatitude?: number;
  readonly capturedLongitude?: number;
  readonly capturedAt?: string;
  readonly idempotencyKey?: string;
};

function resolveUploadUrl(path: string): string {
  const baseUrl = resolveDshApiBaseUrl();
  if (baseUrl.startsWith('/')) {
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
  return new URL(path, baseUrl).toString();
}

async function appendPhoto(form: FormData, photo: CapturedDeliveryProofPhoto): Promise<void> {
  const fileName = photo.fileName?.trim() || `delivery-proof-${Date.now()}.jpg`;
  const mimeType = photo.mimeType?.trim() || 'image/jpeg';

  if (typeof Blob !== 'undefined' && /^(blob:|data:|https?:)/i.test(photo.uri)) {
    const response = await fetch(photo.uri);
    if (!response.ok) throw new Error('تعذر قراءة وسائط إثبات التسليم.');
    const blob = await response.blob();
    form.append('file', blob, fileName);
    return;
  }

  form.append('file', {
    uri: photo.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
}

async function uploadAndSubmitDeliveryProof(
  path: string,
  correlationPrefix: string,
  invalidSessionMessage: string,
  rejectionMessage: string,
  photo: CapturedDeliveryProofPhoto,
  commandId?: string,
): Promise<void> {
  if (!photo.uri.trim()) throw new Error('صورة إثبات التسليم مطلوبة.');

  const baseUrl = resolveDshApiBaseUrl();
  const cookieMode = baseUrl.startsWith('/');
  const token = cookieMode ? undefined : getIdentityAccessToken();
  if (!cookieMode && !token) throw new Error(invalidSessionMessage);

  const form = new FormData();
  await appendPhoto(form, photo);
  const correlationId = corrId(correlationPrefix);

  let response: Response;
  try {
    response = await fetch(resolveUploadUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-Correlation-ID': correlationId,
        ...(commandId?.trim() ? { 'X-Command-ID': commandId.trim() } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
      ...(cookieMode ? { credentials: 'include' as const } : {}),
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'تعذر الاتصال بخدمة إثبات التسليم.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || rejectionMessage);
  }
}

export async function uploadAndSubmitCaptainDeliveryProof(
  assignmentId: string,
  photo: CapturedDeliveryProofPhoto | undefined,
  submission: CaptainDeliveryProofSubmission = {},
): Promise<DshDeliveryProof> {
  const normalizedAssignmentId = assignmentId.trim();
  const pin = submission.pin?.trim() ?? '';
  const evidenceKind = submission.evidenceKind ?? 'photo';
  const idempotencyKey = submission.idempotencyKey?.trim() || corrId('captain-delivery-proof');
  if (!normalizedAssignmentId) throw new Error('لا توجد مهمة نشطة لرفع الإثبات.');
  if (!photo && !/^\d{6}$/.test(pin)) throw new Error('أدخل رمز التسليم أو التقط وسائط إثبات.');

  if (!photo) {
    return submitCaptainDeliveryProof(normalizedAssignmentId, {
      method: 'otp_pin',
      pin,
      idempotencyKey,
      capturedAt: submission.capturedAt ?? new Date().toISOString(),
      ...(submission.capturedLatitude === undefined ? {} : { capturedLatitude: submission.capturedLatitude }),
      ...(submission.capturedLongitude === undefined ? {} : { capturedLongitude: submission.capturedLongitude }),
    });
  }

  const baseUrl = resolveDshApiBaseUrl();
  const cookieMode = baseUrl.startsWith('/');
  const token = cookieMode ? undefined : getIdentityAccessToken();
  if (!cookieMode && !token) throw new Error('جلسة الكابتن غير صالحة.');

  const form = new FormData();
  await appendPhoto(form, photo);
  form.append('evidenceKind', evidenceKind);
  form.append('method', pin ? 'composite' : evidenceKind);
  form.append('idempotencyKey', idempotencyKey);
  form.append('capturedAt', submission.capturedAt ?? new Date().toISOString());
  if (pin) form.append('pin', pin);
  if (submission.capturedLatitude !== undefined) form.append('latitude', String(submission.capturedLatitude));
  if (submission.capturedLongitude !== undefined) form.append('longitude', String(submission.capturedLongitude));

  let response: Response;
  try {
    response = await fetch(
      resolveUploadUrl(`/dsh/captain/dispatch/assignments/${encodeURIComponent(normalizedAssignmentId)}/delivery-proof`),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Correlation-ID': corrId('captain-delivery-proof-media'),
          'X-Idempotency-Key': idempotencyKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
        ...(cookieMode ? { credentials: 'include' as const } : {}),
      },
    );
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'تعذر الاتصال بخدمة إثبات التسليم.');
  }

  const body = await response.json().catch(() => null) as { proof?: DshDeliveryProof; message?: string } | null;
  if (!response.ok || !body?.proof) throw new Error(body?.message || 'رفض DSH إثبات التسليم.');
  return body.proof;
}

export async function uploadAndSubmitPartnerDeliveryProof(
  orderId: string,
  photo: CapturedDeliveryProofPhoto,
  commandId?: string,
): Promise<void> {
  const normalizedOrderId = orderId.trim();
  if (!normalizedOrderId) throw new Error('لا يوجد طلب صالح لرفع الإثبات.');
  return uploadAndSubmitDeliveryProof(
    `/dsh/partner/orders/${encodeURIComponent(normalizedOrderId)}/partner-delivery/proof`,
    'partner-delivery-proof-media',
    'جلسة الشريك غير صالحة.',
    'رفض DSH إثبات توصيل المتجر.',
    photo,
    commandId,
  );
}

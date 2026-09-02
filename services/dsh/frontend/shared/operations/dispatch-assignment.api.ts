import { createDshHttpClient } from '../_kernel/dsh-http-request';
import { secureRandomId } from '../_kernel/secure-random.ts';
import type {
  DshGovernedCreateAssignmentInput,
  DshGovernedDispatchAssignment,
} from '../dispatch/dispatch.types';

const { request } = createDshHttpClient('/api/dsh', 'operator-dispatch-assignment', 15000);

export type AssignOrderToCaptainInput = DshGovernedCreateAssignmentInput;

export function buildDispatchAssignmentIdempotencyKey(
  orderId: string,
  captainId: string,
  nonce = secureRandomId(),
): string {
  return `dispatch:${orderId.trim()}:${captainId.trim()}:${nonce}`;
}

export async function assignOrderToCaptain(
  input: AssignOrderToCaptainInput,
): Promise<DshGovernedDispatchAssignment> {
  const orderId = input.orderId.trim();
  const captainId = input.captainId.trim();
  const serviceAreaCode = input.serviceAreaCode.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  if (!orderId) throw { kind: 'invalid_request', message: 'orderId is required' };
  if (!captainId) throw { kind: 'invalid_request', message: 'captainId is required' };
  if (!serviceAreaCode) throw { kind: 'invalid_request', message: 'serviceAreaCode is required' };
  if (idempotencyKey.length < 16) {
    throw { kind: 'invalid_request', message: 'idempotencyKey must contain at least 16 characters' };
  }
  const result = await request<{ assignment: DshGovernedDispatchAssignment; replayed?: boolean }>(
    '/dsh/operator/dispatch/assignments',
    {
      method: 'POST',
      body: {
        orderId,
        captainId,
        serviceAreaCode,
        priority: input.priority ?? 0,
        offerReason: input.offerReason ?? 'operator selected governed candidate',
        responseTimeoutSeconds: input.responseTimeoutSeconds ?? 90,
        ...(input.distanceMeters === undefined ? {} : { distanceMeters: input.distanceMeters }),
      },
      idempotencyKey,
    },
  );
  return result.assignment;
}

export function dispatchAssignmentErrorMessage(error: unknown): string {
  const typed = error as {
    kind?: string;
    status?: number;
    message?: string;
    body?: { code?: string; message?: string };
  };
  const code = typed.body?.code;
  if (typed.kind === 'network') return 'تعذر الاتصال بخدمة DSH.';
  if (typed.status === 401) return 'انتهت جلسة لوحة التحكم.';
  if (typed.status === 403) return 'لا تملك صلاحية إسناد الطلبات.';
  if (typed.status === 404) return 'الطلب أو الكابتن المحدد لم يعد متاحًا.';
  if (code === 'CAPTAIN_NOT_ELIGIBLE') return 'الكابتن غير معتمد أو غير متاح في منطقة خدمة الطلب.';
  if (code === 'CAPTAIN_AT_CAPACITY') return 'وصل الكابتن إلى الحد الأقصى للمهام النشطة.';
  if (code === 'DISPATCH_OFFER_EXPIRED') return 'انتهت مهلة عرض الإسناد ويجب اختيار كابتن من جديد.';
  if (typed.status === 409) return typed.body?.message ?? typed.message ?? 'تغيرت حالة الطلب أو لديه إسناد نشط بالفعل.';
  return typed.body?.message ?? typed.message ?? 'تعذر إنشاء إسناد الكابتن.';
}

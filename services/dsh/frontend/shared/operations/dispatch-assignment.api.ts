import { createDshHttpClient } from '../_kernel/dsh-http-request';
import type { DshDispatchAssignment } from '../dispatch/dispatch.types';

const { request } = createDshHttpClient('/api/dsh', 'operator-dispatch-assignment', 15000);

export async function assignOrderToCaptain(
  orderId: string,
  captainId: string,
): Promise<DshDispatchAssignment> {
  if (!orderId.trim()) throw { kind: 'invalid_request', message: 'orderId is required' };
  if (!captainId.trim()) throw { kind: 'invalid_request', message: 'captainId is required' };
  const result = await request<{ assignment: DshDispatchAssignment }>(
    '/dsh/operator/dispatch/assignments',
    {
      method: 'POST',
      body: { orderId: orderId.trim(), captainId: captainId.trim() },
    },
  );
  return result.assignment;
}

export function dispatchAssignmentErrorMessage(error: unknown): string {
  const typed = error as { kind?: string; status?: number; message?: string };
  if (typed.kind === 'network') return 'تعذر الاتصال بخدمة DSH.';
  if (typed.status === 401) return 'انتهت جلسة لوحة التحكم.';
  if (typed.status === 403) return 'لا تملك صلاحية إسناد الطلبات.';
  if (typed.status === 404) return 'الطلب أو الكابتن المحدد لم يعد متاحًا.';
  if (typed.status === 409) return 'تغيرت حالة الطلب أو لديه إسناد نشط بالفعل.';
  return typed.message ?? 'تعذر إنشاء إسناد الكابتن.';
}

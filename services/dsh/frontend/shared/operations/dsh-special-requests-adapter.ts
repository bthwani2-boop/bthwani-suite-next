import { dshHttpRequest } from '../_kernel/dsh-http-request';

export type SpecialRequestStatus = 'submitted' | 'processing' | 'completed' | 'cancelled';

export type SpecialRequestRow = {
  id: string;
  clientId: string;
  requestType: 'shein' | 'awnak' | string;
  status: SpecialRequestStatus;
  customerNotes: string;
  currency: string;
  estimatedAmountReference: number;
  productUrl: string;
  quantity: number;
  size: string;
  color: string;
  variantNotes: string;
  deliveryAddressReference: string;
  pickupAddressReference: string;
  dropoffAddressReference: string;
  itemType: string;
  scheduleMode: string;
  scheduledAt: string | null;
  handlingRequirements: string;
  assignedOperatorId: string;
  dispatchAssignmentId: string;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type FetchSpecialRequestsResult =
  | { kind: 'ok'; requests: SpecialRequestRow[]; total: number }
  | { kind: 'offline' }
  | { kind: 'error'; message: string };

export async function fetchOperatorSpecialRequests(options: {
  limit?: number;
  offset?: number;
  requestType?: string;
  status?: string;
}): Promise<FetchSpecialRequestsResult> {
  const query = new URLSearchParams();
  if (options.limit) query.set('limit', String(options.limit));
  if (options.offset) query.set('offset', String(options.offset));
  if (options.requestType) query.set('requestType', options.requestType);
  if (options.status) query.set('status', options.status);

  const res = await dshHttpRequest<{ requests: SpecialRequestRow[]; total: number }>(
    'GET',
    `/dsh/operator/special-requests?${query.toString()}`
  );

  if (res.error) {
    if (res.error.code === 'NETWORK_ERROR') return { kind: 'offline' };
    return { kind: 'error', message: res.error.message || 'Failed to fetch special requests' };
  }

  return {
    kind: 'ok',
    requests: res.data?.requests || [],
    total: res.data?.total || 0,
  };
}

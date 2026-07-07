// Canonical location: dsh/frontend/shared/view-models/control-panel/hr/hr.types.ts
// Authority: dsh/frontend/shared — moved from control-panel/hr/hr.types.ts
// Status: read-only/blocked until backend HR is real.

export type HrWorkspaceId = 'team' | 'readiness' | 'roles' | 'requests' | 'policies';

export type HrWorkspaceMeta = {
  id: HrWorkspaceId;
  label: string;
  runtimeStatus: 'blocked-api-later';
  disabledReason: string;
};

const HR_WORKSPACE_REGISTRY: readonly HrWorkspaceMeta[] = [
  {
    id: 'team',
    label: 'فريق الموظفين',
    runtimeStatus: 'blocked-api-later',
    disabledReason: 'لا يوجد API من لاحقة بيانات HR في هذه المرحلة.',
  },
  {
    id: 'readiness',
    label: 'الجاهزية والحضور',
    runtimeStatus: 'blocked-api-later',
    disabledReason: 'لا توجد بيانات جاهزية متاحة من backend HR.',
  },
  {
    id: 'roles',
    label: 'أدوار HR',
    runtimeStatus: 'blocked-api-later',
    disabledReason: 'الأدوار محجوزة حتى إتمام backend HR.',
  },
  {
    id: 'requests',
    label: 'طلبات الموارد البشرية',
    runtimeStatus: 'blocked-api-later',
    disabledReason: 'طلبات HR التشغيلية غير مفعلة بيانات runtime.',
  },
  {
    id: 'policies',
    label: 'سياسات التوظيف',
    runtimeStatus: 'blocked-api-later',
    disabledReason: 'السياسات غير متاحة في Preview.',
  },
];

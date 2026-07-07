import { colorRoles } from '@bthwani/ui-kit';
export const opsTheme = {
  line: 'var(--border-color, colorRoles.surfaceBase)',
  text: 'var(--text-primary, colorRoles.brandStructure)',
  textMuted: colorRoles.brandStructure,
  surfaceInset: 'var(--surface-inset, colorRoles.surfaceBase)',
  brand: colorRoles.brandAction,
  brandSurface: colorRoles.surfaceBase,
  warning: colorRoles.brandAction,
  warningSurface: colorRoles.surfaceBase,
  success: colorRoles.brandStructure,
  successSurface: colorRoles.surfaceBase,
  surfaceRaised: 'var(--surface-raised, colorRoles.surfaceBase)',
  dangerSurface: colorRoles.surfaceBase,
  danger: colorRoles.brandAction,
  dangerText: colorRoles.brandAction,
  textInverse: colorRoles.surfaceBase,
  infoSurface: colorRoles.surfaceBase,
  info: colorRoles.brandStructure,
  surface: colorRoles.surfaceBase,
};

const OpsTheme = opsTheme;

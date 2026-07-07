import {
  brandRoots,
  brandScale,
  colorRoles,
  statusScale,
  colorPalette,
} from '@bthwani/ui-kit';

const TOKEN_MAP: Record<string, string | undefined> = {
  white: colorPalette.white,
  black: colorPalette.black,
  brand: brandRoots.brandAction,
  brandStrong: brandRoots.brandStructure,
  accentOrange: brandRoots.brandAction,
  accentBlue: colorRoles.info,
  ink: brandRoots.brandStructure,
  danger: colorRoles.danger,
  success: colorRoles.success,
  info: colorRoles.info,
  warning: colorRoles.warning,
  'brand.400': brandScale.action[400],
  'brand.500': brandScale.action[500],
  'brand.600': brandScale.action[600],
  'danger.400': colorRoles.brandAction, // mapped to brandScale/statusScale equivalent
  'danger.600': statusScale.danger,
  'info.600': statusScale.info,
  'info.700': statusScale.infoStrong,
  'success.600': statusScale.success,
};

function resolveDshColorToken(token: string): string {
  return TOKEN_MAP[token] ?? token;
}

import { colorRoles } from "../tokens";

export const theme = {
  colors: colorRoles
} as const;

export type UiTheme = typeof theme;

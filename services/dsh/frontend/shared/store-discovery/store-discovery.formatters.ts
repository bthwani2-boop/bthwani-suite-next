export function formatServiceArea(
  cityCode: string,
  serviceAreaCode: string,
): string {
  return `${cityCode.toUpperCase()} · ${serviceAreaCode}`;
}

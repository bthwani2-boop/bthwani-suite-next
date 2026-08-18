export function isForbiddenAppRuntimeDshImport(file, resolved) {
  return file.startsWith("apps/") && resolved.startsWith("services/dsh/frontend/");
}

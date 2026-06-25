import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-auth-runtime-in-app-shell";
const violations = [];

// shared/app-shell is contracts-only. Auth runtime (useIdentitySession, loginIdentity,
// logoutIdentity, devBypassLogin) belongs exclusively in @bthwani/core-identity.
const AUTH_RUNTIME_SYMBOLS = /\b(useIdentitySession|loginIdentity|logoutIdentity|devBypassLogin|identitySessionStore)\b/;
const AUTH_RUNTIME_IMPORTS = ["@bthwani/core-identity"];

for (const file of listCodeFiles().filter((f) => f.startsWith("shared/app-shell/src/"))) {
  const content = read(file);

  // No import from core-identity (auth runtime) allowed in app-shell
  for (const item of findImportSpecifiers(content)) {
    if (AUTH_RUNTIME_IMPORTS.includes(item.specifier)) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `FORBIDDEN: auth runtime import '${item.specifier}' in app-shell — app-shell is contracts-only`,
      });
    }
  }

  // No auth runtime symbol definitions or exports
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    if (AUTH_RUNTIME_SYMBOLS.test(line)) {
      violations.push({
        file,
        line: i + 1,
        message: `FORBIDDEN: auth runtime symbol in app-shell: ${line.trim().slice(0, 100)}`,
      });
    }
  });
}

fail(guardId, violations);

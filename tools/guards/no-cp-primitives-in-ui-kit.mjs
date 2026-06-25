import { fail, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-cp-primitives-in-ui-kit";
const violations = [];

// Cp* components are owned by @bthwani/control-panel, not shared/ui-kit.
// Neither the files nor the exports of shared/ui-kit may reference Cp* symbols.
const cpPattern = /\bCp[A-Z][a-zA-Z0-9]+/g;

for (const file of listCodeFiles().filter((f) => f.startsWith("shared/ui-kit/src/"))) {
  const content = read(file);
  let match;
  cpPattern.lastIndex = 0;
  while ((match = cpPattern.exec(content))) {
    violations.push({
      file,
      message: `FORBIDDEN: Cp* symbol '${match[0]}' in shared/ui-kit — Cp* primitives belong in @bthwani/control-panel`,
    });
    break; // one violation per file is enough
  }
}

fail(guardId, violations);

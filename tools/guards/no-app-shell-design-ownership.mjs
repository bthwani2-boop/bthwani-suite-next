import { fail, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-app-shell-design-ownership";
const violations = [];

// Design symbols that must NOT be exported from @bthwani/app-shell.
// All visual components, primitives, layouts, and page frames live in @bthwani/ui-kit.
const FORBIDDEN_DESIGN_SYMBOLS = /\b(Cp[A-Z]\w+|ControlPanelShell|ControlPanelTopBar|ControlPanelNavigation|DataTablePageFrame|DetailPageFrame|OverviewPageFrame|QueuePageFrame|OperationsRoomFrame|EditorPageFrame|ReviewPageFrame|MetricsPageFrame|SettingsPageFrame|FinanceReadOnlyFrame|PaginationToolbar)\b/;

for (const file of listCodeFiles().filter((f) => f.startsWith("shared/app-shell/src/"))) {
  const content = read(file);

  // Skip comment-only lines and import-type lines (re-exports of contracts are fine)
  const exportLines = content
    .split("\n")
    .filter((line) => /\bexport\b/.test(line) && !/^\s*\/\//.test(line) && !/export type/.test(line));

  for (const line of exportLines) {
    if (FORBIDDEN_DESIGN_SYMBOLS.test(line)) {
      violations.push({
        file,
        message: `design symbol must not be exported from app-shell: ${line.trim().slice(0, 120)}`,
      });
    }
  }
}

fail(guardId, violations);

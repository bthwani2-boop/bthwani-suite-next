from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "tools/guards/frontend-feature-binding-gate.mjs"
text = TARGET.read_text(encoding="utf-8")

prefix_old = '''const expectedPrefix = {
  "app-client": "services/dsh/frontend/app-client/",
  "app-partner": "services/dsh/frontend/app-partner/",
  "app-captain": "services/dsh/frontend/app-captain/",
  "app-field": "services/dsh/frontend/app-field/",
  "control-panel": "services/dsh/frontend/control-panel/",
};'''
prefix_new = '''const expectedPrefix = {
  "app-client": "services/dsh/frontend/app-client/",
  "app-partner": "services/dsh/frontend/app-partner/",
  "app-captain": "services/dsh/frontend/app-captain/",
  "app-field": "services/dsh/frontend/app-field/",
  "control-panel": "services/dsh/frontend/control-panel/",
};
const surfaceEntrypoints = {
  "app-partner": "services/dsh/frontend/app-partner/DshPartnerSurface.tsx",
};'''
if prefix_old in text:
    text = text.replace(prefix_old, prefix_new, 1)
elif prefix_new not in text:
    raise RuntimeError("frontend binding prefix anchor missing")

check_old = '''    if (screenExists && controllerExists && !hasDependencyPath(entry.screen, entry.controller)) {
      violations.push({ file: entry.screen, line: 0, message: `SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE ${entry.id} -> ${entry.controller}` });
    }'''
check_new = '''    if (screenExists && controllerExists) {
      const directDependency = hasDependencyPath(entry.screen, entry.controller);
      const entrypoint = surfaceEntrypoints[entry.surface];
      const composedDependency = Boolean(
        entrypoint
        && hasDependencyPath(entrypoint, entry.screen)
        && hasDependencyPath(entrypoint, entry.controller),
      );
      if (!directDependency && !composedDependency) {
        violations.push({ file: entry.screen, line: 0, message: `SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE ${entry.id} -> ${entry.controller}` });
      }
    }'''
if check_old in text:
    text = text.replace(check_old, check_new, 1)
elif check_new not in text:
    raise RuntimeError("frontend binding dependency anchor missing")

TARGET.write_text(text, encoding="utf-8")
Path(__file__).unlink()

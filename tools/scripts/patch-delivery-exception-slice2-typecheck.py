from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_all(path: str, replacements: dict[str, str]) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    for old, new in replacements.items():
        text = text.replace(old, new)
    target.write_text(text, encoding="utf-8")


replace_all(
    "services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx",
    {
        '<Box flexDirection="row" gap={2} flexWrap="wrap" justifyContent="space-between">': '<Box gap={2} style={{ flexDirection: \'row\', flexWrap: \'wrap\', justifyContent: \'space-between\' }}>',
        '<Box flexDirection="row" gap={2} flexWrap="wrap">': '<Box gap={2} style={{ flexDirection: \'row\', flexWrap: \'wrap\' }}>',
        '<Box flexDirection="row" gap={4} alignItems="flex-start" flexWrap="wrap">': '<Box gap={4} style={{ flexDirection: \'row\', alignItems: \'flex-start\', flexWrap: \'wrap\' }}>',
        '<Box flex={1} minWidth={340} gap={3}>': '<Box gap={3} style={{ flex: 1, minWidth: 340 }}>',
        '<Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>': '<Box gap={2} style={{ flexDirection: \'row\', justifyContent: \'space-between\', alignItems: \'center\' }}>',
        '<Box gap={1} flex={1}>': '<Box gap={1} style={{ flex: 1 }}>',
        '<Box gap={1} alignItems="flex-end">': '<Box gap={1} style={{ alignItems: \'flex-end\' }}>',
        '<Box flexDirection="row" gap={2}>': '<Box gap={2} style={{ flexDirection: \'row\' }}>',
    },
)

path = ROOT / "services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts"
text = path.read_text(encoding="utf-8")
old = '''  async function loadChecks(visitId: string): Promise<void> {\n    setState({ ...state, checklistState: checklistLoadingState() });\n    try {\n      const checks = await fetchVisitChecks(visitId);\n      setState({ ...state, checklistState: checklistSuccessState(checks) });\n    } catch (err) {\n      setState({ ...state, checklistState: checklistErrorState(resolveMessage(err)) });\n    }\n  }'''
new = '''  async function loadChecks(visit: import("./field-readiness.types").DshFieldVisit): Promise<void> {\n    setState({ ...state, checklistState: checklistLoadingState() });\n    try {\n      const checks = await fetchVisitChecks(visit.id);\n      setState({ ...state, checklistState: checklistSuccessState(visit, checks) });\n    } catch (err) {\n      setState({ ...state, checklistState: checklistErrorState(resolveMessage(err)) });\n    }\n  }'''
if new not in text:
    if old not in text:
        raise RuntimeError("field checklist controller anchor not found")
    text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")

print("Delivery exception slice-two TypeScript corrections applied.")

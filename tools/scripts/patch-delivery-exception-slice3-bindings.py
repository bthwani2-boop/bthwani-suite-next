from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

surface_types = ROOT / 'services/dsh/frontend/shared/delivery/captain.surface.types.ts'
text = surface_types.read_text(encoding='utf-8')
text = text.replace(
    "  captainPodState: 'ready' | 'loading' | 'success' | 'error' | 'retry-required';",
    "  captainPodState: 'ready' | 'loading' | 'success' | 'error';",
)
surface_types.write_text(text, encoding='utf-8')

surface = ROOT / 'services/dsh/frontend/app-captain/DshCaptainSurface.tsx'
text = surface.read_text(encoding='utf-8')
old = '          onReportPodFailure={() => void actions.reportPodFailure()}'
new = '          onReportPodFailure={(draft) => actions.reportPodFailure(draft)}'
if new not in text:
    if old not in text:
        raise RuntimeError('captain surface report binding anchor not found')
    text = text.replace(old, new, 1)
surface.write_text(text, encoding='utf-8')

print('Aligned captain exception state and report binding.')

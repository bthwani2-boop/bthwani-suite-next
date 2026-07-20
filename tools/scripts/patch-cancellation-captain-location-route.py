from pathlib import Path

PATH = Path("services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx")
text = PATH.read_text(encoding="utf-8")
old = '''        <DshCaptainMapScreen
          orderId={activeOrderId}
          captainId={captainRuntimeId}
          onBack={onBack}
          onPushLocation={onPushLocation}
        />'''
new = '''        <DshCaptainMapScreen
          assignmentId={activeAssignmentId}
          orderId={activeOrderId}
          captainId={captainRuntimeId}
          currentStageLabel={activeSummary?.currentStageLabel ?? "مهمة نشطة"}
          onBack={onBack}
          onPushLocation={onPushLocation}
        />'''
if new not in text:
    if old not in text:
        raise RuntimeError("captain map route anchor not found")
    text = text.replace(old, new, 1)
PATH.write_text(text, encoding="utf-8")
print("Captain map route now passes assignment authority and live stage explicitly.")

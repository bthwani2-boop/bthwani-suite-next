from pathlib import Path

path = Path("services/dsh/contracts/dsh.openapi.yaml")
text = path.read_text(encoding="utf-8")
text = text.replace(
    '  /dsh/operator/incidents:\n    $ref: "./paths/support.paths.yaml#/~1dsh~1operator~1incidents"\n',
    "",
)
text = text.replace(
    '  /dsh/operator/incidents/{incidentId}:\n    $ref: "./paths/support.paths.yaml#/~1dsh~1operator~1incidents~1{incidentId}"\n',
    "",
)
path.write_text(text, encoding="utf-8")

from pathlib import Path

path = Path("tools/guards/_openapi-utils.mjs")
text = path.read_text(encoding="utf-8")
if 'import fs from "node:fs";' not in text:
    text = text.replace(
        'import path from "node:path";',
        'import fs from "node:fs";\nimport path from "node:path";',
        1,
    )
path.write_text(text, encoding="utf-8")

from pathlib import Path

root = Path('services/dsh/backend/internal/orders')
for path in sorted(root.glob('*.go')):
    text = path.read_text(encoding='utf-8')
    marker = 'func CancelOrder('
    if marker not in text:
        continue
    start = text.index(marker)
    brace = text.index('{', start)
    depth = 0
    end = brace
    for index in range(brace, len(text)):
        if text[index] == '{':
            depth += 1
        elif text[index] == '}':
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    print(f'FILE={path.as_posix()}')
    print(text[start:end])
    raise SystemExit(0)
raise RuntimeError('governed CancelOrder source not found')

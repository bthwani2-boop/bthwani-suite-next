from pathlib import Path

path = Path('services/dsh/backend/internal/dispatch/delivery_reassignment_db_test.go')
text = path.read_text(encoding='utf-8')
text = text.replace("repeat('r',64)", "repeat('a',64)")
path.write_text(text, encoding='utf-8')
print('Corrected reassignment pricing snapshot hash fixture.')

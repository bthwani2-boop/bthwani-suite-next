import re

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'r', encoding='utf-8') as f:
    cc = f.read()

cc = cc.replace("""\tErrConflict  = errors.New("central catalog conflict")

type ConflictError struct {""", """\tErrConflict  = errors.New("central catalog conflict")
)

type ConflictError struct {""")

cc = cc.replace("""}

\tErrForbidden = errors.New("action not permitted by platform policy")
)""", """}

var (
\tErrForbidden = errors.New("action not permitted by platform policy")
)""")

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'w', encoding='utf-8') as f:
    f.write(cc)
print('Fixed go syntax.')

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'r', encoding='utf-8') as f:
    cc = f.read()

# Change NewConflictError(db dbQuerier, ...) to actually use it instead of dbQuerier which is missing
cc = cc.replace('func NewConflictError(db dbQuerier, ctx context.Context, table, id string, expected *int) error {', 'type dbQuerier interface {\n\tQueryRowContext(ctx context.Context, query string, args ...any) *sql.Row\n}\n\nfunc NewConflictError(db dbQuerier, ctx context.Context, table, id string, expected *int) error {')

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'w', encoding='utf-8') as f:
    f.write(cc)
print('Fixed interface.')

import re

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'r', encoding='utf-8') as f:
    cc = f.read()

# Fix 1: Remove duplicate `Version int `json:"version"`\n\tVersion int `json:"version"`
cc = re.sub(r'(\tVersion int `json:"version"`\n)\tVersion int `json:"version"`\n', r'\1', cc)
cc = re.sub(r'\tVersion int `json:"version"`\n(\s*Version int `json:"version"`)', r'\1', cc)

# Fix 2: Change NewConflictError to use dbQuerier interface
pattern = r'func NewConflictError\(db \*sql\.DB, ctx context\.Context, table, id string, expected \*int\) error \{'
replacement = r'''type dbQuerier interface {
\tQueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}
func NewConflictError(db dbQuerier, ctx context.Context, table, id string, expected *int) error {'''
cc = cc.replace(pattern, replacement)

# Fix 3: Add ExpectedVersion to AssetReviewInput (Wait, AssetReviewInput is named ReviewAssetInput in my script?)
# Actually the Go struct is `ReviewAssetInput` or something? Wait, the error said `AssetReviewInput`.
cc = cc.replace('type AssetReviewInput struct {', 'type AssetReviewInput struct {\n\tExpectedVersion *int `json:"expectedVersion"`')

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'w', encoding='utf-8') as f:
    f.write(cc)
print('Fixed go errors.')

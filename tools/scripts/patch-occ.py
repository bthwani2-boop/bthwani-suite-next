import re

# 1. Update centralcatalog.go structs
with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'r', encoding='utf-8') as f:
    cc = f.read()

# Add ExpectedVersion to inputs
def add_expected(text, struct_name):
    # Find the struct definition
    pattern = rf'(type {struct_name} struct {{\s*)'
    replacement = r'\1\tExpectedVersion *int `json:"expectedVersion"`\n'
    return re.sub(pattern, replacement, text)

cc = add_expected(cc, 'DomainPatchInput')
cc = add_expected(cc, 'NodeUpdateInput')
cc = add_expected(cc, 'MasterProductUpdateInput')
cc = add_expected(cc, 'ProposalUpdateInput')
cc = add_expected(cc, 'ReviewAssetInput')

# Add Version to output structs
def add_version(text, struct_name):
    pattern = rf'(type {struct_name} struct {{\s*)'
    replacement = r'\1\tVersion int `json:"version"`\n'
    return re.sub(pattern, replacement, text)

cc = add_version(cc, 'Domain')
cc = add_version(cc, 'Node')
cc = add_version(cc, 'MasterProduct')
cc = add_version(cc, 'StoreAssortment')
cc = add_version(cc, 'Proposal')
cc = add_version(cc, 'CatalogAsset')
cc = add_version(cc, 'AssetLink')

# Implement ConflictError
conflict_err_code = """
type ConflictError struct {
\tEntityID        string
\tExpectedVersion *int
\tCurrentVersion  int
\tMessage         string
}

func (e *ConflictError) Error() string { return e.Message }

func NewConflictError(db *sql.DB, ctx context.Context, table, id string, expected *int) error {
\tvar current int
\tif err := db.QueryRowContext(ctx, "SELECT version FROM "+table+" WHERE id=$1", id).Scan(&current); err != nil {
\t\treturn ErrNotFound
\t}
\treturn &ConflictError{
\t\tEntityID:        id,
\t\tExpectedVersion: expected,
\t\tCurrentVersion:  current,
\t\tMessage:         "version mismatch",
\t}
}
"""

cc = cc.replace('ErrConflict  = errors.New("central catalog conflict")', 'ErrConflict  = errors.New("central catalog conflict")\n' + conflict_err_code)

# Replace ErrConflict usages with NewConflictError
cc = re.sub(
    r'if n, _ := result\.RowsAffected\(\); n != 1 \{\n\s*return Domain\{\}, ErrNotFound\n\s*\}',
    r'if n, _ := result.RowsAffected(); n != 1 {\n\t\treturn Domain{}, NewConflictError(db, ctx, "dsh_catalog_domains", id, input.ExpectedVersion)\n\t}',
    cc
)

cc = re.sub(
    r'if n, _ := result\.RowsAffected\(\); n != 1 \{\n\s*return Node\{\}, ErrConflict\n\s*\}',
    r'if n, _ := result.RowsAffected(); n != 1 {\n\t\treturn Node{}, NewConflictError(db, ctx, "dsh_catalog_nodes", id, input.ExpectedVersion)\n\t}',
    cc
)

cc = re.sub(
    r'if n, _ := result\.RowsAffected\(\); n != 1 \{\n\s*return MasterProduct\{\}, ErrConflict\n\s*\}',
    r'if n, _ := result.RowsAffected(); n != 1 {\n\t\treturn MasterProduct{}, NewConflictError(db, ctx, "dsh_master_products", id, input.ExpectedVersion)\n\t}',
    cc
)

cc = re.sub(
    r'if n, _ := result\.RowsAffected\(\); n != 1 \{\n\s*return StoreAssortment\{\}, ErrConflict\n\s*\}',
    r'if n, _ := result.RowsAffected(); n != 1 {\n\t\treturn StoreAssortment{}, NewConflictError(db, ctx, "dsh_store_assortments", id, nil)\n\t}',
    cc
)

cc = re.sub(
    r'if n, _ := result\.RowsAffected\(\); n != 1 \{\n\s*return CatalogAsset\{\}, ErrConflict\n\s*\}',
    r'if n, _ := result.RowsAffected(); n != 1 {\n\t\treturn CatalogAsset{}, NewConflictError(tx, ctx, "dsh_catalog_assets", id, input.ExpectedVersion)\n\t}',
    cc
)

# Wait, replace the SQL UPDATE queries to include expected version check!
# Domain
cc = re.sub(
    r'(requires_product_catalog=COALESCE\(\$[0-9]+, requires_product_catalog\),\s*is_manual_request=COALESCE\(\$[0-9]+, is_manual_request\), updated_at=now\(\))\s*WHERE id=(\$[0-9]+)`,([\s\S]*?)isManualRequest, id\)',
    r'\1, version=version+1\n\t\tWHERE id=\2 AND ($10::int IS NULL OR version=$10)`,\3isManualRequest, id, input.ExpectedVersion)',
    cc
)

# Node
cc = re.sub(
    r'(is_active=COALESCE\(\$[0-9]+, is_active\),\s*is_client_visible=COALESCE\(\$[0-9]+, is_client_visible\), updated_at=now\(\))\s*WHERE id=(\$[0-9]+)`,([\s\S]*?)isClientVisible, id\)',
    r'\1, version=version+1\n\t\tWHERE id=\2 AND ($10::int IS NULL OR version=$10)`,\3isClientVisible, id, input.ExpectedVersion)',
    cc
)

# MasterProduct
cc = re.sub(
    r'(is_active=COALESCE\(\$[0-9]+, is_active\), updated_at=now\(\))\s*WHERE id=(\$[0-9]+)`,([\s\S]*?)isActive, id\)',
    r'\1, version=version+1\n\t\tWHERE id=\2 AND ($11::int IS NULL OR version=$11)`,\3isActive, id, input.ExpectedVersion)',
    cc
)

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'w', encoding='utf-8') as f:
    f.write(cc)

# 2. Update http/centralcatalog.go
with open('services/dsh/backend/internal/http/centralcatalog.go', 'r', encoding='utf-8') as f:
    hc = f.read()

handler_conflict = """
	var conflictErr *centralcatalog.ConflictError
	if errors.As(err, &conflictErr) {
		store.SendJSON(w, http.StatusConflict, map[string]any{
			"code": "CONFLICT",
			"message": conflictErr.Message,
			"entityId": conflictErr.EntityID,
			"expectedVersion": conflictErr.ExpectedVersion,
			"currentVersion": conflictErr.CurrentVersion,
		})
		return
	}
"""

# Insert the handler case in writeCentralCatalogError
hc = hc.replace('case errors.Is(err, centralcatalog.ErrConflict):\n\t\tstore.SendError(w, http.StatusConflict, "CONFLICT", "central catalog conflict")', handler_conflict)

with open('services/dsh/backend/internal/http/centralcatalog.go', 'w', encoding='utf-8') as f:
    f.write(hc)

print('Patched OCC logic.')

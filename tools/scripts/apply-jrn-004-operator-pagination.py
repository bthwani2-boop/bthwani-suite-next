from pathlib import Path

path = Path("services/dsh/backend/internal/http/protected_store.go")
source = path.read_text(encoding="utf-8")
old = '''func (s *protectedStoreServer) handleOperatorStores(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead, "operator")
	if !ok {
		return
	}
	result, err := store.ListAllStores(s.db, store.DshStoreListQuery{Limit: 100, Offset: 0})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load stores")
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}
'''
new = '''func (s *protectedStoreServer) handleOperatorStores(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead, "operator")
	if !ok {
		return
	}
	listQuery, errMessage := store.ParseListQuery(r.URL.Query())
	if errMessage != "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", errMessage)
		return
	}
	result, err := store.ListAllStores(s.db, listQuery)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load stores")
		return
	}
	store.SendJSON(w, http.StatusOK, result)
}
'''
count = source.count(old)
if count != 1:
    raise SystemExit(f"expected one operator list block, found {count}")
path.write_text(source.replace(old, new), encoding="utf-8")

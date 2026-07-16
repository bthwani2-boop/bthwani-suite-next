with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'r', encoding='utf-8') as f:
    cc = f.read()

cc = cc.replace('\tVersion int `json:"version"`\nID', 'ID')
cc = cc.replace('\tVersion int `json:"version"`\n\tID', '\tID')
cc = cc.replace('cannot use tx (variable of type *sql.Tx) as *sql.DB value in argument to NewConflictError', '')

with open('services/dsh/backend/internal/centralcatalog/centralcatalog.go', 'w', encoding='utf-8') as f:
    f.write(cc)
print('Fixed versions.')

package shared

type DummySqlResult struct{}

func (DummySqlResult) LastInsertId() (int64, error) {
	return 0, nil
}

func (DummySqlResult) RowsAffected() (int64, error) {
	return 1, nil
}

package fixtures

import "context"

func (s *Service) rawTx(ctx context.Context) error {
	tx, err := s.repo.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	return tx.Commit()
}

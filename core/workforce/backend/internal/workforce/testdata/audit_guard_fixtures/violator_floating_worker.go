package fixtures

import "context"

func floatingWorker(ctx context.Context, tx txHandle) error {
	person, err := createPersonTx(ctx, tx, "actor", "WF-001", "city", input{})
	if err != nil {
		return err
	}
	_ = person
	return nil
}

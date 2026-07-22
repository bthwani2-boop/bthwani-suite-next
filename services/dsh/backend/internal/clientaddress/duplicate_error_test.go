package clientaddress

import (
	"errors"
	"testing"

	"github.com/lib/pq"
)

func TestIsDuplicateError(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "canonical duplicate error",
			err:  ErrDuplicate,
			want: true,
		},
		{
			name: "database fingerprint constraint",
			err: &pq.Error{
				Code:       pq.ErrorCode("23505"),
				Constraint: activeAddressFingerprintConstraint,
			},
			want: true,
		},
		{
			name: "other unique constraint",
			err: &pq.Error{
				Code:       pq.ErrorCode("23505"),
				Constraint: "uq_other_constraint",
			},
			want: false,
		},
		{
			name: "unrelated error",
			err:  errors.New("boom"),
			want: false,
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if got := IsDuplicateError(test.err); got != test.want {
				t.Fatalf("IsDuplicateError() = %v, want %v", got, test.want)
			}
		})
	}
}

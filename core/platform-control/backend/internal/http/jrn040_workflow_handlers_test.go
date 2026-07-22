package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"platform-control-api/internal/platformcontrol"
)

func TestJRN040GovernedErrorsExposeStableCodes(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		statusCode int
		code       string
	}{
		{
			name:       "rollback reason required",
			err:        platformcontrol.ErrRollbackReason,
			statusCode: http.StatusUnprocessableEntity,
			code:       "PLATFORM_ROLLBACK_REASON_REQUIRED",
		},
		{
			name:       "sensitive value forbidden",
			err:        platformcontrol.ErrSensitiveValue,
			statusCode: http.StatusUnprocessableEntity,
			code:       "PLATFORM_SENSITIVE_VALUE_FORBIDDEN",
		},
		{
			name:       "target conflict",
			err:        platformcontrol.ErrTargetConflict,
			statusCode: http.StatusConflict,
			code:       "PLATFORM_TARGET_CONFLICT",
		},
		{
			name:       "maker checker review",
			err:        platformcontrol.ErrMakerCheckerReview,
			statusCode: http.StatusConflict,
			code:       "PLATFORM_MAKER_CHECKER_VIOLATION",
		},
		{
			name:       "stale validation snapshot",
			err:        platformcontrol.ErrValidationSnapshot,
			statusCode: http.StatusConflict,
			code:       "PLATFORM_VALIDATION_SNAPSHOT_REQUIRED",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			sendPlatformError(recorder, test.err)
			if recorder.Code != test.statusCode {
				t.Fatalf("status=%d want=%d", recorder.Code, test.statusCode)
			}
			if !strings.Contains(recorder.Body.String(), `"code":"`+test.code+`"`) {
				t.Fatalf("response does not contain %s: %s", test.code, recorder.Body.String())
			}
		})
	}
}

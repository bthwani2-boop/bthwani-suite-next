package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

func RegisterFieldOnboardingAssignmentRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)

	mux.HandleFunc("GET /dsh/operator/field-onboarding-assignments", protected.handleListOperatorFieldOnboardingAssignments)
	mux.HandleFunc("POST /dsh/operator/field-onboarding-assignments", protected.handleCreateFieldOnboardingAssignment)
	mux.HandleFunc("POST /dsh/operator/field-onboarding-assignments/{assignmentId}/reassign", protected.handleReassignFieldOnboardingAssignment)
	mux.HandleFunc("POST /dsh/operator/field-onboarding-assignments/{assignmentId}/cancel", protected.handleCancelFieldOnboardingAssignment)

	mux.HandleFunc("GET /dsh/field/onboarding-assignments", protected.handleListFieldOnboardingAssignments)
	mux.HandleFunc("GET /dsh/field/onboarding-assignments/{assignmentId}", protected.handleGetFieldOnboardingAssignment)
	mux.HandleFunc("POST /dsh/field/onboarding-assignments/{assignmentId}/open", protected.handleOpenFieldOnboardingAssignment)
	mux.HandleFunc("POST /dsh/field/onboarding-assignments/{assignmentId}/draft", protected.handleConvertFieldOnboardingAssignmentToDraft)
	mux.HandleFunc("POST /dsh/field/onboarding-assignments/{assignmentId}/draft/{partnerId}", protected.handleLinkFieldOnboardingAssignmentDraft)
}

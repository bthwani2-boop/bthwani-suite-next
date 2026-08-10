package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	identityhttp "identity-api/internal/http"
	"identity-api/internal/identity"
)

const localBootstrapRetryInterval = 10 * time.Second

// localBootstrapPassTimeout bounds a single convergence pass so an unreachable
// database can never stall the supervisor. It matches the startup gate.
const localBootstrapPassTimeout = 8 * time.Second

func main() {
	port := envOr("PORT", "8082")
	databaseURL := os.Getenv("DATABASE_URL")
	bootstrapOperatorContextID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))

	db, err := openIdentityDatabase(databaseURL)
	if err != nil {
		log.Printf("[identity-api] database configuration unavailable; liveness remains available and readiness is fail-closed")
		db = nil
	}
	if db == nil {
		log.Printf("[identity-api] DATABASE_URL is unavailable; liveness remains available and readiness is fail-closed")
	} else {
		startupProbeContext, startupProbeCancel := context.WithTimeout(context.Background(), 2*time.Second)
		if err := db.PingContext(startupProbeContext); err != nil {
			log.Printf("[identity-api] database unavailable at startup; liveness remains available and readiness is fail-closed")
		}
		startupProbeCancel()
	}

	repository := identity.NewRepository(db)
	localBootstrap := identity.LocalBootstrap{
		Enabled:           strings.EqualFold(strings.TrimSpace(os.Getenv("IDENTITY_LOCAL_BOOTSTRAP")), "true"),
		Password:          os.Getenv("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD"),
		OperatorContextID: bootstrapOperatorContextID,
	}

	supervisorContext, stopSupervisor := context.WithCancel(context.Background())
	defer stopSupervisor()

	// Local bootstrap owns password-authenticated development fixtures. Those
	// fixtures must be fully converged before any authentication endpoint can
	// accept requests; otherwise readiness can race ahead of credential repair and
	// mobile bootstrap requests can turn a stale local password into a lockout.
	// Production is unaffected because this path is inactive unless the explicit
	// local bootstrap switch is enabled.
	if db != nil && localBootstrap.Enabled {
		log.Printf("[identity-api] authentication serving deferred until local development bootstrap converges")
		convergeLocalBootstrapBeforeServing(repository, localBootstrap)

		// Startup convergence alone cannot survive a database that is emptied or
		// recreated while this process keeps serving, so the same authority is
		// supervised for the lifetime of the process.
		go superviseLocalBootstrap(
			supervisorContext,
			localBootstrapRetryInterval,
			func(passContext context.Context) (bool, error) {
				return repository.LocalBootstrapConverged(passContext, localBootstrap)
			},
			func(passContext context.Context) error {
				return bootstrapLocalIdentityState(passContext, repository, localBootstrap)
			},
			newLocalBootstrapReporter(log.Printf),
		)
	} else if db == nil && localBootstrap.Enabled {
		log.Printf("[identity-api] local bootstrap cannot converge until a database is configured; readiness remains fail-closed")
	}

	router := identityhttp.NewRouter(repository)

	identityhttp.RegisterEmployeeAccessRoutes(router, repository)
	identityhttp.RegisterPartnerAccessRoutes(router, repository)
	authRouter := identityhttp.AuthOperatorContextBoundary(repository, router)
	issuerScopedRouter := identityhttp.ActivationIssuerBoundary(db, authRouter)
	operatorScopedRouter := identityhttp.OperatorBoundary(db, issuerScopedRouter)
	internalTrustRouter := identityhttp.RuntimeOperatorContextBoundary(operatorScopedRouter)
	otpScopedRouter := identityhttp.OtpBoundary(repository, internalTrustRouter)
	// Readiness is the outer persistence boundary so no authentication,
	// activation, operator-context, or service middleware can touch persistence
	// before the authoritative fail-closed gate has passed.
	runtimeReadinessRouter := identityhttp.RuntimeReadinessBoundary(otpScopedRouter, db)
	server := &http.Server{
		Addr: ":" + port,
		Handler: identityhttp.BrowserOriginGuard(
			identityhttp.CorsMiddleware(
				identityhttp.RequestContractMiddleware(
					identityhttp.ActivationSafetyMiddleware(runtimeReadinessRouter),
				),
			),
		),
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    32 * 1024,
	}

	go func() {
		log.Printf("[identity-api] listening on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[identity-api] listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	if db != nil {
		_ = db.Close()
	}
}

func openIdentityDatabase(databaseURL string) (*sql.DB, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, nil
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)
	return db, nil
}

func convergeLocalBootstrapBeforeServing(repository *identity.Repository, bootstrap identity.LocalBootstrap) {
	for {
		ctx, cancel := context.WithTimeout(context.Background(), localBootstrapPassTimeout)
		err := bootstrapLocalIdentityState(ctx, repository, bootstrap)
		cancel()
		if err == nil {
			log.Printf("[identity-api] local development identity bootstrap is ready")
			return
		}
		log.Printf("[identity-api] local bootstrap not yet converged; authentication serving remains closed: %v", err)
		time.Sleep(localBootstrapRetryInterval)
	}
}

// localBootstrapOutcome is the result of one supervisor pass.
type localBootstrapOutcome struct {
	Repaired bool
	Err      error
}

// superviseLocalBootstrap keeps the local development bootstrap converged for as
// long as the process serves.
//
// The bootstrap used to run exactly once, before the listener started. Any path
// that empties or recreates identity_runtime underneath a live container — a
// governed database rebuild, a manual reset — left the process serving against a
// database with no actors: database/sql reconnects transparently, so nothing
// signalled the process to converge again. Every login then failed with
// INVALID_CREDENTIALS until somebody recreated the container by hand, and
// bootstrap-dev still reported PASS because no phase owned that state.
//
// The loop repairs only what is actually broken; a converged runtime costs one
// counting query per tick and mutates nothing.
func superviseLocalBootstrap(
	ctx context.Context,
	interval time.Duration,
	converged func(context.Context) (bool, error),
	reconcile func(context.Context) error,
	report func(localBootstrapOutcome),
) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			passContext, endPass := context.WithTimeout(ctx, localBootstrapPassTimeout)
			ok, err := converged(passContext)
			switch {
			case err != nil:
				report(localBootstrapOutcome{Err: err})
			case ok:
				report(localBootstrapOutcome{})
			default:
				err = reconcile(passContext)
				report(localBootstrapOutcome{Repaired: err == nil, Err: err})
			}
			endPass()
		}
	}
}

// newLocalBootstrapReporter logs on transition only. A steady state is silent
// because the readiness probe already emits a line every few seconds.
func newLocalBootstrapReporter(logf func(string, ...any)) func(localBootstrapOutcome) {
	healthy := true
	return func(outcome localBootstrapOutcome) {
		switch {
		case outcome.Err != nil:
			if healthy {
				healthy = false
				logf("[identity-api] local development bootstrap lost convergence: %v", outcome.Err)
			}
		case outcome.Repaired:
			healthy = true
			logf("[identity-api] local development identity bootstrap was re-converged after the database lost its canonical actors")
		default:
			healthy = true
		}
	}
}

func bootstrapLocalIdentityState(
	ctx context.Context,
	repository *identity.Repository,
	bootstrap identity.LocalBootstrap,
) error {
	if err := repository.BootstrapLocalActors(ctx, bootstrap); err != nil {
		return err
	}
	if err := repository.BootstrapLocalPlatformActors(ctx, bootstrap); err != nil {
		return err
	}
	if err := repository.BootstrapSovereignLeadershipAccess(ctx, bootstrap); err != nil {
		return err
	}
	return repository.ReconcileLocalBootstrapSecurityState(ctx, bootstrap)
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

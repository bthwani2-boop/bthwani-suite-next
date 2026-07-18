package platformcontrol

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type ServiceDependency struct {
	Name      string
	HealthURL string
}

type dependencyProbeResult struct {
	index   int
	posture ServicePosture
}

func (s *Service) ConfigureDependencies(dependencies []ServiceDependency) {
	s.dependencies = append([]ServiceDependency(nil), dependencies...)
}

func (s *Service) Services(ctx context.Context) []ServicePosture {
	checkedAt := s.now().UTC()
	platformState := StateOperational
	platformEvidence := "core/platform-control PostgreSQL and governed workflow"
	platformMessage := "database reachable"
	if err := s.Ready(ctx); err != nil {
		platformState = StateFixRequired
		platformEvidence = "core/platform-control database unavailable"
		platformMessage = err.Error()
	}
	services := []ServicePosture{
		{
			Service:        "platform-control",
			State:          platformState,
			EvidenceSource: platformEvidence,
			CheckedAt:      &checkedAt,
			Message:        platformMessage,
		},
	}

	if len(s.dependencies) == 0 {
		return append(services, ServicePosture{
			Service:        "dependency-health",
			State:          StateContractRequired,
			EvidenceSource: "PLATFORM_CONTROL_DEPENDENCY_HEALTH_URLS",
			CheckedAt:      &checkedAt,
			Message:        "no dependency health endpoints configured",
		})
	}

	results := make(chan dependencyProbeResult, len(s.dependencies))
	var wait sync.WaitGroup
	for index, dependency := range s.dependencies {
		index := index
		dependency := dependency
		wait.Add(1)
		go func() {
			defer wait.Done()
			results <- dependencyProbeResult{index: index, posture: s.probeDependency(ctx, dependency)}
		}()
	}
	wait.Wait()
	close(results)

	ordered := make([]ServicePosture, len(s.dependencies))
	for result := range results {
		ordered[result.index] = result.posture
	}
	return append(services, ordered...)
}

func (s *Service) probeDependency(ctx context.Context, dependency ServiceDependency) ServicePosture {
	started := time.Now()
	checkedAt := s.now().UTC()
	posture := ServicePosture{
		Service:        strings.TrimSpace(dependency.Name),
		State:          StateContractRequired,
		EvidenceSource: "configured runtime health endpoint",
		Endpoint:       strings.TrimSpace(dependency.HealthURL),
		CheckedAt:      &checkedAt,
	}
	if posture.Service == "" {
		posture.Service = "unknown-service"
	}
	if posture.Endpoint == "" {
		posture.Message = "health endpoint not configured"
		return posture
	}

	probeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(probeCtx, http.MethodGet, posture.Endpoint, nil)
	if err != nil {
		posture.State = StateFixRequired
		posture.Message = err.Error()
		return posture
	}
	resp, err := s.healthClient.Do(req)
	posture.LatencyMS = time.Since(started).Milliseconds()
	if err != nil {
		posture.State = StateFixRequired
		posture.Message = err.Error()
		return posture
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	posture.EvidenceSource = fmt.Sprintf("GET %s -> %d", posture.Endpoint, resp.StatusCode)
	if resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusMultipleChoices {
		posture.State = StateOperational
		posture.Message = "health endpoint returned success"
		return posture
	}
	posture.State = StateFixRequired
	posture.Message = fmt.Sprintf("health endpoint returned HTTP %d", resp.StatusCode)
	return posture
}

func aggregateHealthState(services []ServicePosture) PlatformControlState {
	if len(services) == 0 {
		return StateUnknownHealth
	}
	state := StateOperational
	for _, service := range services {
		switch service.State {
		case StateFixRequired:
			return StateFixRequired
		case StateContractRequired, StatePartiallyBound, StateUnknownHealth:
			state = StatePartiallyBound
		}
	}
	return state
}

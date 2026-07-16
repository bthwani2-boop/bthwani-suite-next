package media

import (
	"context"
	"sync/atomic"
	"time"
)

type ProviderConfig struct {
	Endpoint       string
	PublicEndpoint string
	AccessKey      string
	SecretKey      string
	Bucket         string
	UseSSL         bool
	PublicUseSSL   bool
}

type Provider struct {
	cfg        ProviderConfig
	client     atomic.Pointer[Client]
	configured bool
}

func NewProvider(ctx context.Context, cfg ProviderConfig, retryEvery time.Duration) *Provider {
	p := &Provider{cfg: cfg, configured: cfg.Endpoint != ""}
	if !p.configured {
		return p
	}
	if retryEvery <= 0 {
		retryEvery = 15 * time.Second
	}
	p.connect(ctx)
	go p.run(ctx, retryEvery)
	return p
}

func NewStaticProvider(client *Client) *Provider {
	p := &Provider{configured: client != nil}
	if client != nil {
		p.client.Store(client)
	}
	return p
}

func (p *Provider) Configured() bool {
	return p != nil && p.configured
}

func (p *Provider) Client() *Client {
	if p == nil {
		return nil
	}
	return p.client.Load()
}

func (p *Provider) Ready(ctx context.Context) bool {
	if p == nil || !p.configured {
		return true
	}
	client := p.Client()
	if client == nil {
		p.connect(ctx)
		client = p.Client()
		if client == nil {
			return false
		}
	}
	return client.EnsureBucket(ctx) == nil
}

func (p *Provider) Status(ctx context.Context) string {
	if p == nil || !p.configured {
		return "not-configured"
	}
	if p.Ready(ctx) {
		return "ok"
	}
	return "unavailable"
}

func (p *Provider) run(ctx context.Context, retryEvery time.Duration) {
	for {
		p.connect(ctx)

		timer := time.NewTimer(retryEvery)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
	}
}

func (p *Provider) connect(ctx context.Context) {
	client, err := NewClient(
		p.cfg.Endpoint,
		p.cfg.PublicEndpoint,
		p.cfg.AccessKey,
		p.cfg.SecretKey,
		p.cfg.Bucket,
		p.cfg.UseSSL,
		p.cfg.PublicUseSSL,
	)
	if err == nil && client.EnsureBucket(ctx) == nil {
		p.client.Store(client)
	}
}

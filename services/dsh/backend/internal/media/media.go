// Package media proxies binary object uploads/downloads through dsh-api to MinIO.
// The mobile client only ever talks to dsh-api (same host it already reaches for
// every other DSH request); it never needs direct network access to MinIO's port.
package media

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	mc             *minio.Client
	bucket         string
	publicEndpoint string // see NewClient
	useSSL         bool
}

// NewClient connects to MinIO using the given endpoint/credentials and ensures
// the target bucket exists. endpoint must be host:port with no scheme.
//
// publicEndpoint controls the host:port written into presigned PUT URLs
// (PresignPut). It must be reachable by the *uploading client* (a browser, a
// phone -- not dsh-api itself). In Docker Compose, dsh-api talks to MinIO
// over the internal Docker network hostname (e.g. "minio:9000"), but a
// presigned URL handed back to a browser/app outside that network must point
// at the host-published port (e.g. "localhost:59000") instead. The presign
// operation itself must still run against the internal client, though --
// minio-go's presigner does a bucket-location lookup over the network, and
// that has to go through the endpoint dsh-api can actually reach; only the
// resulting URL's host gets rewritten to publicEndpoint afterward. If
// publicEndpoint is empty, no rewrite happens (correct for a deployment
// where dsh-api and its clients share one network / hostname).
func NewClient(ctx context.Context, endpoint, publicEndpoint, accessKey, secretKey, bucket string, useSSL bool) (*Client, error) {
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("media: failed to create minio client: %w", err)
	}

	exists, err := mc.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("media: failed to check bucket: %w", err)
	}
	if !exists {
		if err := mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("media: failed to create bucket: %w", err)
		}
	}

	return &Client{mc: mc, bucket: bucket, publicEndpoint: publicEndpoint, useSSL: useSSL}, nil
}

// Upload streams reader into the bucket under key, returning the stored object key.
func (c *Client) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error {
	_, err := c.mc.PutObject(ctx, c.bucket, key, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("media: upload failed: %w", err)
	}
	return nil
}

// PresignPut returns a time-limited URL the caller can PUT the object body
// to directly, without ever holding MinIO credentials, plus its expiry. The
// caller is expected to send the same Content-Type it declared at intent
// time; StatObject re-checks that after the fact rather than binding it into
// the signature, since minio-go's presign helper doesn't support that.
func (c *Client) PresignPut(ctx context.Context, key string, ttl time.Duration) (uploadURL string, expiresAt time.Time, err error) {
	u, err := c.mc.PresignedPutObject(ctx, c.bucket, key, ttl)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("media: presign put failed: %w", err)
	}
	if c.publicEndpoint != "" {
		u.Host = c.publicEndpoint
		if c.useSSL {
			u.Scheme = "https"
		} else {
			u.Scheme = "http"
		}
	}
	return u.String(), time.Now().Add(ttl), nil
}

// StatObject reports whether the object exists and, if so, its size and
// content-type.
func (c *Client) StatObject(ctx context.Context, key string) (size int64, contentType string, err error) {
	info, err := c.mc.StatObject(ctx, c.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		return 0, "", fmt.Errorf("media: stat failed: %w", err)
	}
	return info.Size, info.ContentType, nil
}

// ChecksumSHA256 downloads the object and hashes it, for callers (like
// catalog asset completion) that need a real integrity checksum rather than
// MinIO's ETag, which is only an MD5 for single-part uploads and isn't a
// guaranteed content hash in general.
func (c *Client) ChecksumSHA256(ctx context.Context, key string) (string, error) {
	obj, err := c.mc.GetObject(ctx, c.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return "", fmt.Errorf("media: checksum get failed: %w", err)
	}
	defer obj.Close()
	h := sha256.New()
	if _, err := io.Copy(h, obj); err != nil {
		return "", fmt.Errorf("media: checksum read failed: %w", err)
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// Get streams the object back for proxying to a client.
func (c *Client) Get(ctx context.Context, key string) (io.ReadCloser, string, error) {
	obj, err := c.mc.GetObject(ctx, c.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", fmt.Errorf("media: get failed: %w", err)
	}
	info, err := obj.Stat()
	if err != nil {
		_ = obj.Close()
		return nil, "", fmt.Errorf("media: object not found: %w", err)
	}
	return obj, info.ContentType, nil
}

// BuildKey produces a namespaced, filename-safe object key.
func BuildKey(namespace, ownerID, entityID, fileName string) string {
	return fmt.Sprintf("%s/%s/%s/%s", namespace, sanitize(ownerID), sanitize(entityID), sanitize(fileName))
}

func sanitize(s string) string {
	s = strings.TrimSpace(s)
	replacer := strings.NewReplacer("/", "-", "\\", "-", "..", "-", " ", "-")
	return replacer.Replace(s)
}

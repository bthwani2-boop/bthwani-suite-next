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
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	mc        *minio.Client
	presignMC *minio.Client
	bucket    string
}

// NewClient creates MinIO clients using the given endpoint/credentials.
// endpoint must be host:port with no scheme.
//
// publicEndpoint controls the host:port used to sign presigned PUT URLs
// (PresignPut). It must be reachable by the uploading client. It is configured
// on a dedicated presign client instead of rewriting URL hosts after signing,
// because SigV4 signs the host header.
func NewClient(endpoint, publicEndpoint, accessKey, secretKey, bucket string, useSSL, publicUseSSL bool) (*Client, error) {
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("media: failed to create minio client: %w", err)
	}

	presignEndpoint := endpoint
	presignUseSSL := useSSL
	if publicEndpoint != "" {
		presignEndpoint = publicEndpoint
		presignUseSSL = publicUseSSL
	}
	presignMC, err := minio.New(presignEndpoint, &minio.Options{
		Creds:        credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure:       presignUseSSL,
		Region:       "us-east-1",
		BucketLookup: minio.BucketLookupPath,
	})
	if err != nil {
		return nil, fmt.Errorf("media: failed to create minio presign client: %w", err)
	}

	return &Client{mc: mc, presignMC: presignMC, bucket: bucket}, nil
}

// EnsureBucket ensures the configured bucket exists.
func (c *Client) EnsureBucket(ctx context.Context) error {
	exists, err := c.mc.BucketExists(ctx, c.bucket)
	if err != nil {
		return fmt.Errorf("media: failed to check bucket: %w", err)
	}
	if !exists {
		if err := c.mc.MakeBucket(ctx, c.bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("media: failed to create bucket: %w", err)
		}
	}
	return nil
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
	u, err := c.presignMC.PresignedPutObject(ctx, c.bucket, key, ttl)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("media: presign put failed: %w", err)
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

// Remove deletes an object from the bucket.
func (c *Client) Remove(ctx context.Context, key string) error {
	if err := c.mc.RemoveObject(ctx, c.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("media: remove failed: %w", err)
	}
	return nil
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

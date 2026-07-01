// Package media proxies binary object uploads/downloads through dsh-api to MinIO.
// The mobile client only ever talks to dsh-api (same host it already reaches for
// every other DSH request); it never needs direct network access to MinIO's port.
package media

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	mc     *minio.Client
	bucket string
}

// NewClient connects to MinIO using the given endpoint/credentials and ensures
// the target bucket exists. endpoint must be host:port with no scheme.
func NewClient(ctx context.Context, endpoint, accessKey, secretKey, bucket string, useSSL bool) (*Client, error) {
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

	return &Client{mc: mc, bucket: bucket}, nil
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

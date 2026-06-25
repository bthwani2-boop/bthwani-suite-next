# DSH-001 media asset provenance

- Six original store illustrations were generated with the built-in OpenAI image generation tool on 2026-06-21.
- Each source was resized locally to a 640px hero JPEG and a 256px logo JPEG.
- The twelve project assets live under `services/dsh/database/seeds/local/media`.
- `runtime:all` uploads them to the public-read `dsh-media` bucket in the Docker MinIO runtime.
- The database seed stores the MinIO object URLs; the client rewrites only the host for LAN device access.
- No donor image, external trademark, embedded text, or fabricated remote URL is used.

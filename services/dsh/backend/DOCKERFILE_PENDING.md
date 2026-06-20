# DSH Dockerfile Pending

Do not create services/dsh/backend/Dockerfile until all are true:

- DSH backend entrypoint exists
- /health endpoint exists
- /ready endpoint exists
- DSH database migration exists
- DSH local seed exists
- DSH API smoke exists
- runtime does not use memory repo
- runtime does not use CORS wildcard
- runtime does not use donor container names, donor ports, or donor volumes

First allowed activation slice:

- DSH-001 Store Discovery

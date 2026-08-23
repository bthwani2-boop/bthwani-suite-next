FROM golang:1.26.5-alpine AS build
WORKDIR /app

COPY services/wlt/backend/go.mod services/wlt/backend/go.sum ./services/wlt/backend/
WORKDIR /app/services/wlt/backend
RUN go mod download

WORKDIR /app
COPY services/wlt/backend/ ./services/wlt/backend/

WORKDIR /app/services/wlt/backend
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/wlt-api cmd/wlt-api/main.go

FROM alpine:3.22 AS runtime
RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S app \
    && adduser -S -G app app

WORKDIR /app
COPY --from=build --chown=app:app /out/wlt-api /usr/local/bin/wlt-api

USER app
EXPOSE 8083
ENTRYPOINT ["/usr/local/bin/wlt-api"]

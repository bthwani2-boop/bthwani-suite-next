FROM golang:1.26.5-alpine AS build
WORKDIR /app

COPY services/dsh/backend/go.mod services/dsh/backend/go.sum ./services/dsh/backend/
WORKDIR /app/services/dsh/backend
RUN go mod download

WORKDIR /app
COPY services/dsh/backend/ ./services/dsh/backend/

WORKDIR /app/services/dsh/backend
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/dsh-api cmd/dsh-api/main.go

FROM alpine:3.22 AS runtime
RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S app \
    && adduser -S -G app app

WORKDIR /app
COPY --from=build --chown=app:app /out/dsh-api /usr/local/bin/dsh-api

USER app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/dsh-api"]

FROM golang:1.26.5-alpine AS build
WORKDIR /app

COPY services/dsh/backend/go.mod services/dsh/backend/go.sum ./services/dsh/backend/
WORKDIR /app/services/dsh/backend
RUN go mod download

WORKDIR /app
COPY services/dsh/backend/ ./services/dsh/backend/

WORKDIR /app/services/dsh/backend
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o dsh-api cmd/dsh-api/main.go

FROM alpine:3.22 AS runtime
RUN apk add --no-cache \
      ca-certificates=20260611-r0 \
      tzdata=2026c-r0

WORKDIR /app
COPY --from=build /app/services/dsh/backend/dsh-api /app/dsh-api

EXPOSE 8080
CMD ["/app/dsh-api"]

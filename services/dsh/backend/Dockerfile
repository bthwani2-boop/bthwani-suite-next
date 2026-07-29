FROM golang:1.26.5-alpine AS build
WORKDIR /app

# Copy dependency files
COPY services/dsh/backend/go.mod services/dsh/backend/go.sum ./services/dsh/backend/
WORKDIR /app/services/dsh/backend
RUN go mod download

# Copy the rest of the Go backend files
WORKDIR /app
COPY services/dsh/backend/ ./services/dsh/backend/

# Build the Go API
WORKDIR /app/services/dsh/backend
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/dsh-api cmd/dsh-api/main.go

FROM alpine:3.21 AS runtime
RUN apk --no-cache add ca-certificates tzdata \
  && addgroup -S app \
  && adduser -S app -G app

WORKDIR /app
COPY --from=build /out/dsh-api /app/dsh-api
USER app

EXPOSE 8080
ENTRYPOINT ["/app/dsh-api"]

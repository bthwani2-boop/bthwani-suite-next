FROM golang:1.26-alpine AS build
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
RUN CGO_ENABLED=0 GOOS=linux go build -o dsh-api cmd/dsh-api/main.go

# Runtime stage
FROM alpine:latest AS runtime
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=build /app/services/dsh/backend/dsh-api /app/dsh-api

EXPOSE 8080
CMD ["/app/dsh-api"]

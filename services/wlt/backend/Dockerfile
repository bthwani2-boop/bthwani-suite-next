FROM golang:1.26.5-alpine AS build
WORKDIR /app

COPY services/wlt/backend/go.mod services/wlt/backend/go.sum ./services/wlt/backend/
WORKDIR /app/services/wlt/backend
RUN go mod download

WORKDIR /app
COPY services/wlt/backend/ ./services/wlt/backend/

WORKDIR /app/services/wlt/backend
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/wlt-api cmd/wlt-api/main.go

FROM alpine:3.21 AS runtime
RUN apk --no-cache add ca-certificates tzdata \
  && addgroup -S app \
  && adduser -S app -G app

WORKDIR /app
COPY --from=build /out/wlt-api /app/wlt-api
USER app

EXPOSE 8083
ENTRYPOINT ["/app/wlt-api"]

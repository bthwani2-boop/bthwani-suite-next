FROM golang:1.26.5-alpine AS build
WORKDIR /app

COPY services/wlt/backend/go.mod services/wlt/backend/go.sum ./services/wlt/backend/
WORKDIR /app/services/wlt/backend
RUN go mod download

WORKDIR /app
COPY services/wlt/backend/ ./services/wlt/backend/

WORKDIR /app/services/wlt/backend
RUN CGO_ENABLED=0 GOOS=linux go build -o wlt-api cmd/wlt-api/main.go

FROM alpine:latest AS runtime
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=build /app/services/wlt/backend/wlt-api /app/wlt-api

EXPOSE 8083
CMD ["/app/wlt-api"]

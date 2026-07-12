FROM golang:1.26-alpine AS build
WORKDIR /src
COPY core/identity/backend/go.mod core/identity/backend/go.sum* ./
RUN go mod download
COPY core/identity/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/identity-api ./cmd/identity-api

FROM alpine:3.21
RUN addgroup -S app && adduser -S app -G app
USER app
COPY --from=build /out/identity-api /identity-api
EXPOSE 8082
ENTRYPOINT ["/identity-api"]

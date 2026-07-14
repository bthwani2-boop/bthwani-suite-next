FROM golang:1.26.5-alpine AS build
WORKDIR /src
COPY core/providers/backend/go.mod core/providers/backend/go.sum* ./
RUN go mod download
COPY core/providers/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/providers-api ./cmd/providers-api

FROM alpine:3.21
RUN addgroup -S app && adduser -S app -G app
USER app
COPY --from=build /out/providers-api /providers-api
EXPOSE 8087
ENTRYPOINT ["/providers-api"]

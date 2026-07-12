FROM golang:1.26.5-alpine AS build
WORKDIR /src
COPY core/workforce/backend/go.mod core/workforce/backend/go.sum* ./
RUN go mod download
COPY core/workforce/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/workforce-api ./cmd/workforce-api

FROM alpine:3.21
RUN addgroup -S app && adduser -S app -G app
USER app
COPY --from=build /out/workforce-api /workforce-api
EXPOSE 8086
ENTRYPOINT ["/workforce-api"]

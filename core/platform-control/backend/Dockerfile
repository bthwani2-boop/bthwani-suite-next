FROM golang:1.26.5-alpine AS build
WORKDIR /src/core/platform-control/backend
COPY core/platform-control/backend/go.mod core/platform-control/backend/go.sum* ./
COPY core/identity/clients/go/identityauth/ /src/core/identity/clients/go/identityauth/
RUN go mod download
COPY core/platform-control/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/platform-control-api ./cmd/platform-control-api

FROM alpine:3.22
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /usr/local/go/lib/time/zoneinfo.zip /usr/share/zoneinfo.zip
ENV ZONEINFO=/usr/share/zoneinfo.zip
RUN addgroup -S app && adduser -S -G app app
COPY --from=build /out/platform-control-api /usr/local/bin/platform-control-api
USER app
EXPOSE 8088
ENTRYPOINT ["/usr/local/bin/platform-control-api"]

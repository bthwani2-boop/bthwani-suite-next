# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

USER root

# Fail during Codespace image build if the Node/Corepack/PNPM toolchain is missing.
RUN set -eux; \
    node --version; \
    corepack --version; \
    corepack enable; \
    corepack prepare pnpm@10.34.2 --activate; \
    pnpm --version

USER node

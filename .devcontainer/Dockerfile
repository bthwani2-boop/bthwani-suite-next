# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

SHELL ["/bin/bash", "-lc"]

USER root

ENV NVM_DIR=/usr/local/share/nvm
ENV PATH=/usr/local/share/nvm/current/bin:/usr/local/bin:/usr/bin:/bin

RUN set -eux; \
    if [ -s "${NVM_DIR}/nvm.sh" ]; then . "${NVM_DIR}/nvm.sh"; fi; \
    command -v node; \
    node --version; \
    command -v corepack; \
    corepack --version; \
    corepack enable; \
    corepack prepare pnpm@10.34.2 --activate; \
    hash -r; \
    command -v pnpm; \
    pnpm --version; \
    test "$(pnpm --version)" = "10.34.2"; \
    ln -sf "$(command -v node)" /usr/local/bin/node; \
    ln -sf "$(command -v corepack)" /usr/local/bin/corepack; \
    ln -sf "$(command -v pnpm)" /usr/local/bin/pnpm; \
    /usr/local/bin/node --version; \
    /usr/local/bin/corepack --version; \
    /usr/local/bin/pnpm --version

USER node

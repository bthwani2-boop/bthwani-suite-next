FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
WORKDIR /app/services/dsh
COPY services/dsh/package.json ./package.json
RUN npm install --omit=dev

FROM base AS build
COPY services/dsh/package.json ./services/dsh/package.json
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.34.2 --activate
RUN pnpm --filter @bthwani/dsh install --frozen-lockfile
COPY services/dsh/tsconfig.json ./services/dsh/tsconfig.json
COPY services/dsh/domain ./services/dsh/domain
COPY services/dsh/backend ./services/dsh/backend
COPY services/dsh/clients ./services/dsh/clients
RUN pnpm --filter @bthwani/dsh run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/services/dsh/node_modules ./services/dsh/node_modules
COPY --from=build /app/services/dsh/dist ./services/dsh/dist
WORKDIR /app/services/dsh
EXPOSE 8080
CMD ["node", "dist/backend/runtime/server.js"]

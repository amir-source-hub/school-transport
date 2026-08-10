# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

FROM dependencies AS source

COPY . .

FROM source AS api-build

RUN pnpm --filter @school-transport/api build
RUN pnpm --filter @school-transport/api deploy --prod --legacy /deploy/api
RUN find apps/api/dist -type f \
  \( -name '*.d.ts' -o -name '*.js.map' -o -name '*.test.js' -o -name '*.test.js.map' -o -name '*.tsbuildinfo' \) \
  -delete

FROM source AS web-build

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
ARG NEXT_DEPLOYMENT_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID

RUN --mount=type=secret,id=next_server_actions_encryption_key,required=true \
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/next_server_actions_encryption_key)" \
  pnpm --filter web build
RUN pnpm --filter web deploy --prod --legacy /deploy/web

FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS runtime

RUN apt-get update \
  && apt-get install --yes --no-install-recommends tini=0.19.0-1+b3 \
  && rm -rf /var/lib/apt/lists/*

ENV HOME=/tmp
ENV XDG_CACHE_HOME=/tmp/.cache
ENV NODE_ENV=production

WORKDIR /app

RUN chown node:node /app

ENTRYPOINT ["/usr/bin/tini", "--"]

FROM runtime AS api

ENV HOST=0.0.0.0
ENV PORT=5000

COPY --from=api-build --chown=node:node /deploy/api/node_modules ./node_modules
COPY --from=api-build --chown=node:node /workspace/apps/api/dist ./dist
COPY --from=api-build --chown=node:node /workspace/apps/api/drizzle ./drizzle
COPY --from=api-build --chown=node:node /workspace/apps/api/package.json ./package.json

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]

FROM runtime AS web

ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=web-build --chown=node:node /deploy/web/node_modules ./node_modules
COPY --from=web-build --chown=node:node /workspace/apps/web/.next ./.next
COPY --from=web-build --chown=node:node /workspace/apps/web/public ./public
COPY --from=web-build --chown=node:node /workspace/apps/web/src ./src
COPY --from=web-build --chown=node:node /workspace/apps/web/package.json ./package.json
COPY --from=web-build --chown=node:node /workspace/apps/web/next.config.ts ./next.config.ts

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]

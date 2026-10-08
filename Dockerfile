FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npm_ca,target=/tmp/npm-ca.pem \
    if test -s /tmp/npm-ca.pem; then \
      NODE_EXTRA_CA_CERTS=/tmp/npm-ca.pem npm ci --no-audit --no-fund; \
    else \
      npm ci --no-audit --no-fund; \
    fi
COPY . .
ARG SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1 SITE_URL=$SITE_URL
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATABASE_PATH=/app/data/kaleadoskill.sqlite
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/src/content/legal ./src/content/legal
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["npm", "start"]

# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/orchestrator/package.json packages/orchestrator/package.json
COPY packages/rag/package.json packages/rag/package.json
COPY packages/llm/package.json packages/llm/package.json
RUN npm ci --ignore-scripts

FROM deps AS build
WORKDIR /app
ENV NODE_ENV=development
COPY . .
RUN mkdir -p apps/dashboard
RUN npx turbo run build --filter=@meta-chat/dashboard...

FROM build AS prune
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173
RUN groupadd --system nodejs && useradd --system --gid nodejs nodejs
COPY --from=prune /app/package.json ./package.json
COPY --from=prune /app/package-lock.json ./package-lock.json
COPY --from=prune /app/node_modules ./node_modules
COPY --from=build /app/apps/dashboard ./apps/dashboard
COPY --from=build /app/packages ./packages
COPY docker/dashboard-entrypoint.cjs ./docker/dashboard-entrypoint.cjs
USER nodejs
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');const req=http.request({host:'127.0.0.1',port:process.env.PORT||4173,path:'/health',timeout:5000},res=>{if(res.statusCode!==200){process.exit(1);}res.resume();res.on('end',()=>process.exit(0));});req.on('error',()=>process.exit(1));req.end();"
CMD ["node", "docker/dashboard-entrypoint.cjs"]

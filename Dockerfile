# Imagen única: compila el frontend y lo sirve la misma API (un solo puerto).
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production TZ=America/La_Paz
WORKDIR /app/backend
COPY --from=backend /app/backend/node_modules ./node_modules
COPY --from=backend /app/backend/dist ./dist
COPY --from=backend /app/backend/package.json ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/cli.js migrar && node dist/server.js"]

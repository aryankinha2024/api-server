# Build frontend stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app

COPY frontend/package*.json ./frontend/

RUN cd frontend && npm ci

COPY frontend/ ./frontend/

RUN cd frontend && npm run build

# Build backend stage
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm ci --only=production

# Runtime stage
FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy backend node_modules and code
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --chown=nodejs:nodejs backend/ ./backend/

# Copy built frontend into backend/public
COPY --chown=nodejs:nodejs --from=frontend-builder /app/frontend/dist ./backend/public

USER nodejs

EXPOSE 5000

WORKDIR /app/backend

CMD ["npm", "start"]

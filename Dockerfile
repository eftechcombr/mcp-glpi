# =============================================================================
# Stage 1: Build — compile TypeScript and run linter
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Build the project
COPY tsconfig.json eslint.config.js ./
COPY src/ ./src/
COPY test/ ./test/
COPY scripts/ ./scripts/
RUN npm run lint && npm run build

# =============================================================================
# Stage 2: Runtime — minimal production image
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER nodeuser

ENV NODE_ENV=production

# Note: This server uses MCP stdio transport. EXPOSE is not required for
# stdio-based communication but is kept for documentation purposes and
# future HTTP/SSE transport compatibility.
EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]

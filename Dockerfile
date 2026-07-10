# =============================================================================
# Stage 1: Build — compile TypeScript and run linter
# =============================================================================
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install dependencies first (better layer caching)
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

# Build the project
COPY tsconfig.json eslint.config.js ./
COPY src/ ./src/
COPY test/ ./test/
COPY scripts/ ./scripts/
RUN bun run lint && bun run build

# =============================================================================
# Stage 2: Runtime — minimal production image
# =============================================================================
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 bunuser

# Install production dependencies only
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile --production

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER bunuser

ENV NODE_ENV=production

# Note: This server uses MCP stdio transport. EXPOSE is not required for
# stdio-based communication but is kept for documentation purposes and
# future HTTP/SSE transport compatibility.
EXPOSE 3000

ENTRYPOINT ["bun", "dist/index.js"]

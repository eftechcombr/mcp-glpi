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

# Default transport is MCP stdio (no TCP port needed).
# To serve over Streamable HTTP (multi-tenant), run with MCP_TRANSPORT=http:
#   docker run -e MCP_TRANSPORT=http -e PORT=3000 -p 3000:3000 ...
# The server then listens on {HOST}:{PORT}{MCP_PATH} (default /mcp).
EXPOSE 3000

ENTRYPOINT ["bun", "dist/index.js"]

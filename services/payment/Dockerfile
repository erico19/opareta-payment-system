FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Remove dev dependencies and keep only production
RUN npm prune --production

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/payments/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
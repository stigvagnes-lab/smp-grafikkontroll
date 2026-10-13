FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . ./

# Build frontend production bundle
RUN npm run build

# Expose port (default 3000, Cloud Run injects PORT env)
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["npm", "start"]

# Build stage for React Frontend
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Final stage for Node/Python Backend
FROM python:3.9-slim
WORKDIR /app

# Install Node.js for Express server
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY server/ ./server/
COPY src/ ./src/
COPY vector_db/ ./vector_db/
COPY package*.json ./
RUN npm install

# Copy built frontend from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 3001

# Start the Node.js server
CMD ["node", "server/index.js"]

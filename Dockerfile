FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy server code
COPY src/ ./src/

# Port exposed, typically overridden in docker-compose, default is purely informational here
EXPOSE 3001

# Command to start the app
CMD ["node", "src/server.js"]

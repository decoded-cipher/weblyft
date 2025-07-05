# Stage 1: Build Stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /home/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy remaining files explicitly
COPY ./entrypoint.sh ./server.js /home/app/

# Ensure scripts are executable
RUN chmod +x /home/app/entrypoint.sh /home/app/server.js



# Stage 2: Runtime Stage
FROM alpine:latest

# Install necessary packages
RUN apk add --no-cache git nodejs npm

# Set working directory
WORKDIR /home/app

# Copy the built application from the build stage
COPY --from=build /home/app /home/app

# Ensure the entrypoint script is executable
RUN chmod +x /home/app/entrypoint.sh /home/app/server.js

# Set the entrypoint
CMD ["sh", "./entrypoint.sh"]
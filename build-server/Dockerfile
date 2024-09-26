# Use a lightweight base image
FROM node:20-alpine

# Set working directory
WORKDIR /home/app

# Install curl and git, and install dependencies
COPY package*.json ./
RUN apk add --no-cache curl git && \
    npm ci --only=production && \
    npm cache clean --force

# Copy remaining files explicitly
COPY ./entrypoint.sh /home/app/entrypoint.sh
COPY ./server.js /home/app/server.js

# Ensure scripts are executable
RUN chmod +x /home/app/entrypoint.sh /home/app/server.js

# Set the entrypoint
CMD ["sh", "./entrypoint.sh"]
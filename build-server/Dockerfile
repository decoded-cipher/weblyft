FROM ubuntu:focal

# Install dependencies and Node.js in one layer
RUN apt-get update && apt-get install -y curl git && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /home/app

COPY package*.json ./
RUN npm install --only=production && rm -rf /root/.npm

# Copy remaining files
COPY entrypoint.sh server.js ./

# Ensure scripts are executable
RUN chmod +x entrypoint.sh server.js

ENTRYPOINT ["/home/app/entrypoint.sh"]

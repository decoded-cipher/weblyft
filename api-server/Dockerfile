# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /home/app

COPY package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /root/.npm /root/.cache /tmp/*

COPY . .

# RUN npx prisma generate && \
#     npm run build

RUN npm run build


# Stage 2: Production
FROM alpine:latest

RUN apk add --no-cache nodejs npm

WORKDIR /home/app

COPY --from=build /home/app/dist ./dist
COPY --from=build /home/app/package*.json ./
COPY --from=build /home/app/prisma ./prisma

RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /root/.npm /root/.cache /tmp/*

EXPOSE 5000

CMD ["node", "dist/index.js"]
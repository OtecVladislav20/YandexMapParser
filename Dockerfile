FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS deps
RUN npm ci

FROM deps AS dev
COPY . .
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY openapi.yml ./openapi.yml

EXPOSE 8000
CMD ["node", "dist/server.js"]

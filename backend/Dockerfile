FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Prisma only needs a syntactically valid URL to generate the client. The real
# DATABASE_URL is supplied by Docker Compose when the application runs.
RUN DATABASE_URL="mysql://build:build@localhost:3306/build" npx prisma generate && npm run build

FROM node:22-bookworm-slim AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main.js"]

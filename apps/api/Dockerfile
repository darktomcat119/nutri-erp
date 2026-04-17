FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/uploads

EXPOSE 4000

CMD ["sh", "-c", "sleep 3 && npx prisma migrate deploy && npx ts-node --compiler-options '{\"module\":\"commonjs\"}' prisma/seed.ts 2>/dev/null; node dist/src/main.js"]

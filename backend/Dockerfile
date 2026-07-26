FROM node:22-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@11.9.0 --activate

RUN pnpm config set ignore-scripts false

COPY . .

RUN pnpm install --prod=false

RUN pnpm --filter backend build

ENV PORT=3001

EXPOSE 3001

CMD ["pnpm", "--filter", "backend", "start"]
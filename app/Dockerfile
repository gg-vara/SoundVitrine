# What needs the development dependencies : Vite's build, and Scalar's browser script, without the large package it comes with
FROM oven/bun:1.4.4-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY web ./web
COPY vite.config.ts tsconfig.json ./
RUN bun run build

##
##
##

FROM oven/bun:1.4.4-alpine

WORKDIR /app

# only production dependencies, as locked
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/node_modules/@scalar/api-reference/dist/browser/standalone.js ./node_modules/@scalar/api-reference/dist/browser/standalone.js
COPY --from=build /app/dist ./dist

COPY src ./src
COPY assets ./assets
COPY public ./public
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=80

# can be overriden
ENV SOUNDVITRINE_STATE_PATH=/app/_state

EXPOSE 80

HEALTHCHECK CMD bun -e "process.exit((await fetch('http://localhost:' + process.env.PORT + '/healthz')).ok ? 0 : 1)"

CMD ["bun", "src/index.ts"]

# What needs the development dependencies : Vite's build, and Scalar's browser script, without the large package it comes with
# Not on Alpine : Solid's compiler has no build for musl. The result is plain JavaScript, whichever system made it
FROM oven/bun:1.4.4 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY client ./client
# Tailwind also reads the classes of the pages (client/style.css)
COPY server/pages ./server/pages
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
COPY --from=build /app/client/dist ./client/dist

COPY server ./server
COPY client/legacy ./client/legacy
COPY client/public ./client/public
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=80

# can be overriden
ENV SOUNDVITRINE_STATE_PATH=/app/_state

EXPOSE 80

HEALTHCHECK CMD bun -e "process.exit((await fetch('http://localhost:' + process.env.PORT + '/healthz')).ok ? 0 : 1)"

CMD ["bun", "server/index.ts"]

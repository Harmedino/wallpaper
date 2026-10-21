FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
RUN mkdir -p /app/.data/media && chown -R node:node /app/.data
USER node
EXPOSE 3000
CMD ["npm","start"]

FROM node:18-bullseye as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18-bullseye as prod

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/build /app/build
COPY --from=builder /app/build /app/build
# CATcher's cat drawings
COPY assets /app/assets

RUN npm ci --omit=dev

ENTRYPOINT [ "npm", "run", "prod" ]

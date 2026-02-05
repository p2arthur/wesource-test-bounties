FROM node:20-alpine

# Install openssl - required for Prisma on Alpine
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Explicitly generate the client for the container's OS
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

# Apply migrations on container start, then run the dev server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]

FROM node:20-alpine

# Instala OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código fonte
COPY . .

# Gera cliente Prisma
RUN npx prisma generate

# Cria diretório para storage
RUN mkdir -p /app/storage/fiscal

EXPOSE 3333

# Executa migrations e inicia servidor com tsx
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/server.ts"]

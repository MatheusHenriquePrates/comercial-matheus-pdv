#!/bin/bash

echo "🚀 Setup Comercial Matheus PDV"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js 18+"
    exit 1
fi

echo "✅ Node.js $(node --version) encontrado"

# Check if PostgreSQL is accessible
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL CLI não encontrado (psql), mas você pode ter o servidor rodando."
fi

# Create database if it doesn't exist
echo ""
echo "📦 Configurando banco de dados..."
echo "   Criando banco 'comercial_matheus_pdv' se não existir..."
PGPASSWORD=2004 psql -U postgres -h localhost -c "CREATE DATABASE comercial_matheus_pdv;" 2>/dev/null || echo "   Banco já existe ou erro na criação"

# Backend setup
echo ""
echo "📦 Instalando dependências do backend..."
cd "$(dirname "$0")/../backend"

# Copy .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "   Arquivo .env criado a partir do .env.example"
fi

npm install

# Prisma setup
echo ""
echo "🗄️ Configurando Prisma..."
npx prisma generate
npx prisma db push --accept-data-loss
npx prisma db seed

cd ..

# Frontend setup
echo ""
echo "📦 Instalando dependências do frontend..."
cd frontend

# Copy .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "   Arquivo .env criado a partir do .env.example"
fi

npm install

cd ..

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Para iniciar o sistema, execute:"
echo "  ./scripts/start-dev.sh"
echo ""
echo "Ou manualmente:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "🔑 Credenciais de acesso:"
echo "   Username: admin"
echo "   Password: admin123"

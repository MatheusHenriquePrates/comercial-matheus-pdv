#!/bin/bash

echo "🚀 Iniciando Comercial Matheus PDV"
echo ""

# Get script directory
SCRIPT_DIR="$(dirname "$0")"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Encerrando servidores..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start backend
echo "🔧 Iniciando backend (http://localhost:3333)..."
cd "$PROJECT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "   Aguardando backend iniciar..."
sleep 3

# Start frontend
echo "🎨 Iniciando frontend (http://localhost:5173)..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

echo ""
echo "✅ Sistema iniciado!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3333"
echo "❤️  Health Check: http://localhost:3333/health"
echo ""
echo "🔑 Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "Pressione Ctrl+C para parar os servidores"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID

#!/bin/bash

echo "=== PDV System Diagnostic Tool ==="
echo ""

# Check if backend is running
echo "1. Checking backend status..."
curl -s http://localhost:3333/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ Backend is running"
else
    echo "   ✗ Backend is NOT running!"
fi

# Check if frontend is accessible
echo ""
echo "2. Checking frontend..."
curl -s http://localhost:5173 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ Frontend is accessible"
else
    echo "   ✗ Frontend is NOT accessible!"
fi

# Count products in database
echo ""
echo "3. Checking database products..."
PGPASSWORD=matheus_db_pass psql -h localhost -p 5432 -U matheus_comercial -d comercial_pdv -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | tr -d '[:space:]'
if [ $? -eq 0 ]; then
    COUNT=$(PGPASSWORD=matheus_db_pass psql -h localhost -p 5432 -U matheus_comercial -d comercial_pdv -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | tr -d '[:space:]')
    echo "   ✓ Found $COUNT products in database"
else
    echo "   ✗ Could not connect to database"
fi

echo ""
echo "4. Checking localStorage theme..."
echo "   Run this in browser console:"
echo "   localStorage.getItem('theme-storage')"

echo ""
echo "5. Checking DOM classes..."
echo "   Run this in browser console:"
echo "   document.documentElement.className"

echo ""
echo "=== Diagnostic complete ==="

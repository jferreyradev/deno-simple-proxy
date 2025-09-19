#!/bin/bash
echo "🚀 Compilando Deno Oracle Proxy..."
echo

# Limpiar ejecutable anterior si existe
if [ -f "deno-oracle-proxy" ]; then
    echo "🗑️ Eliminando ejecutable anterior..."
    rm deno-oracle-proxy
fi

echo "📦 Compilando con deno compile..."
deno compile --allow-net --allow-read --allow-write --allow-env --output deno-oracle-proxy main.ts

if [ -f "deno-oracle-proxy" ]; then
    echo
    echo "✅ Compilación exitosa!"
    echo "📄 Ejecutable: deno-oracle-proxy"
    
    # Mostrar información del archivo
    echo "📊 Tamaño: $(du -h deno-oracle-proxy | cut -f1)"
    
    echo
    echo "🎯 Para ejecutar: ./deno-oracle-proxy"
    echo "🌐 Servidor iniciará en: http://localhost:8003"
else
    echo
    echo "❌ Error en la compilación"
    exit 1
fi

echo
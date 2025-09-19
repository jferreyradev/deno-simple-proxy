@echo off
echo 🚀 Compilando Deno Oracle Proxy...
echo.

REM Limpiar ejecutable anterior si existe
if exist deno-oracle-proxy.exe (
    echo 🗑️ Eliminando ejecutable anterior...
    del deno-oracle-proxy.exe
)

echo 📦 Compilando con deno compile...
deno compile --allow-net --allow-read --allow-write --allow-env --output deno-oracle-proxy main.ts

if exist deno-oracle-proxy.exe (
    echo.
    echo ✅ Compilación exitosa!
    echo 📄 Ejecutable: deno-oracle-proxy.exe
    
    REM Mostrar información del archivo
    for %%A in (deno-oracle-proxy.exe) do (
        echo 📊 Tamaño: %%~zA bytes (~%%~zA:~0,-6% MB)
    )
    
    echo.
    echo 🎯 Para ejecutar: .\deno-oracle-proxy.exe
    echo 🌐 Servidor iniciará en: http://localhost:8003
) else (
    echo.
    echo ❌ Error en la compilación
    exit /b 1
)

echo.
pause
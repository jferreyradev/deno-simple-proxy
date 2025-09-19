@echo off
echo 🚀 Generando paquete de distribución para Deno Oracle Proxy...
echo.

REM Crear directorio de distribución
if exist dist rmdir /s /q dist
mkdir dist

echo 📦 Compilando ejecutable...
deno compile --allow-net --allow-read --allow-write --allow-env --output dist\deno-oracle-proxy main.ts

if not exist dist\deno-oracle-proxy.exe (
    echo ❌ Error en la compilación
    exit /b 1
)

echo 📄 Copiando archivos de configuración...
copy .env.example dist\
copy README.md dist\
copy BUILD.md dist\

echo 📝 Creando instrucciones de instalación...
echo # 🚀 Deno Oracle Proxy - Distribución > dist\INSTALL.md
echo. >> dist\INSTALL.md
echo ## 📋 Instalación >> dist\INSTALL.md
echo. >> dist\INSTALL.md
echo 1. **Configurar variables de entorno**: >> dist\INSTALL.md
echo    ```bash >> dist\INSTALL.md
echo    cp .env.example .env >> dist\INSTALL.md
echo    # Edita .env con tus URLs y tokens >> dist\INSTALL.md
echo    ``` >> dist\INSTALL.md
echo. >> dist\INSTALL.md
echo 2. **Ejecutar el servidor**: >> dist\INSTALL.md
echo    ```bash >> dist\INSTALL.md
echo    .\deno-oracle-proxy.exe >> dist\INSTALL.md
echo    ``` >> dist\INSTALL.md
echo. >> dist\INSTALL.md
echo 3. **Acceder al servidor**: >> dist\INSTALL.md
echo    - URL: http://localhost:8003 >> dist\INSTALL.md
echo    - Health check: http://localhost:8003/api/health >> dist\INSTALL.md
echo    - Documentación: http://localhost:8003/api/info >> dist\INSTALL.md
echo. >> dist\INSTALL.md
echo ## 🔒 Importante >> dist\INSTALL.md
echo. >> dist\INSTALL.md
echo - **NUNCA** incluyas el archivo .env en repositorios >> dist\INSTALL.md
echo - Configura URLs y tokens según tu entorno >> dist\INSTALL.md
echo - El archivo .env.example es solo una plantilla >> dist\INSTALL.md

echo.
echo ✅ Paquete de distribución creado en ./dist/
echo 📄 Archivos incluidos:
dir dist
echo.
echo 🎯 Para distribuir, comprime la carpeta ./dist/
echo 💡 El usuario final solo necesita configurar .env y ejecutar

pause
# 🛠️ Scripts de Compilación

Este directorio incluye scripts para compilar el proyecto a un ejecutable nativo.

## Windows

```bat
build.bat
```

## Linux/macOS

```bash
chmod +x build.sh
./build.sh
```

## Manual

```bash
deno compile --allow-net --allow-read --allow-write --allow-env --output deno-oracle-proxy main.ts
```

## Información del Ejecutable

- **Tamaño**: ~87MB
- **Permisos incluidos**: 
  - `--allow-net`: Acceso a red
  - `--allow-read`: Lectura de archivos (.env, config)
  - `--allow-write`: Escritura de logs
  - `--allow-env`: Variables de entorno
- **Plataformas**: Windows, Linux, macOS

## Uso del Ejecutable

```bash
# Windows
.\deno-oracle-proxy.exe

# Linux/macOS
./deno-oracle-proxy
```

El servidor iniciará automáticamente en `http://localhost:8003`
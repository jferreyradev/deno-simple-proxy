# 🔧 Configuración del Deno Oracle Proxy

La configuración del proxy se ha modularizado para facilitar el mantenimiento y el despliegue en diferentes ambientes.

## 📁 Estructura de Configuración

```
config.ts          # Configuración centralizada
.env.example       # Plantilla de variables de entorno
main.ts           # Archivo principal (ahora más limpio)
```

## 🚀 Uso Rápido

### 1. **Configuración por Defecto**
```bash
# Funciona sin configuración adicional
deno task start
```

### 2. **Con Variables de Entorno**
```bash
# 1. Copia la plantilla
cp .env.example .env

# 2. Edita las variables según tu necesidad
# 3. Inicia el servidor
deno task start
```

### 3. **Por Ambiente**
```bash
# Desarrollo (por defecto)
NODE_ENV=development deno task start

# Producción 
NODE_ENV=production deno task start

# Testing
NODE_ENV=testing deno task start
```

## ⚙️ Variables de Entorno Disponibles

### 🌍 Servidor
- `PORT` - Puerto del servidor (default: 8003)
- `NODE_ENV` - Ambiente: development/production/testing

### 📝 Logging
- `LOG_DIR` - Directorio de logs (default: ./logs)
- `LOG_FILE` - Nombre del archivo de log (default: proxy.log)
- `LOG_LEVEL` - Nivel: DEBUG/INFO/WARN/ERROR (default: INFO)
- `LOG_MAX_SIZE` - Tamaño máximo por archivo en bytes (default: 5MB)
- `LOG_MAX_BACKUPS` - Número de archivos de backup (default: 10)
- `LOG_CONSOLE` - Mostrar en consola: true/false (default: true)

### 📊 SQL Logging
- `SQL_LOG_DIR` - Directorio de logs SQL (default: ./logs)
- `SQL_LOG_FILE` - Archivo de logs SQL (default: sql-inserts.log)
- `SQL_LOG_MAX_SIZE` - Tamaño máximo archivo SQL (default: 50MB)
- `SQL_LOG_MAX_BACKUPS` - Backups archivo SQL (default: 15)

### 🎯 API Destino
- `DESTINATION_URL` - URL de la API destino
- `DESTINATION_METHOD` - Método HTTP (default: POST)
- `DESTINATION_AUTH` - Token de autorización (default: Bearer demo)

### 🔐 Tokens por API
- `API_8081_TOKEN` - Token para APIs en puerto 8081
- `EMPRESA_API_TOKEN` - Token para api.empresa.com

## 🔧 Configuración Avanzada

### **Personalizar Configuración en Código**
```typescript
import { getConfig } from "./config.ts";

// Override específico
const config = getConfig({
  server: { port: 9000 },
  logger: { level: "DEBUG" }
});
```

### **Configuración por Ambiente**
```typescript
import { getConfigForEnvironment } from "./config.ts";

const config = getConfigForEnvironment("production");
```

## 🌍 Configuración por Ambiente

### **Development** (por defecto)
- Puerto: 8003
- Logs: DEBUG habilitado en consola
- CORS: Permisivo

### **Production**
- Puerto: 8080
- Logs: Solo INFO, sin consola
- CORS: Dominios específicos

### **Testing**
- Puerto: Aleatorio
- Logs: Solo ERROR
- CORS: Deshabilitado

## 📝 Ejemplos de Uso

### **Desarrollo Local**
```bash
# .env
NODE_ENV=development
PORT=8003
LOG_LEVEL=DEBUG
```

### **Producción**
```bash
# .env
NODE_ENV=production
PORT=8080
LOG_LEVEL=INFO
LOG_CONSOLE=false
DESTINATION_URL=https://api.produccion.com/exec
DESTINATION_AUTH=Bearer token-real-produccion
```

### **CI/CD Testing**
```bash
# Variables en pipeline
NODE_ENV=testing
LOG_LEVEL=ERROR
LOG_CONSOLE=false
```

## 🔄 Migración desde Configuración Antigua

El archivo `main.ts` anteriormente contenía toda la configuración hardcodeada. Ahora:

- ✅ Configuración centralizada en `config.ts`
- ✅ Variables de entorno soportadas
- ✅ Configuración por ambiente
- ✅ Archivo principal más limpio y mantenible

La configuración antigua sigue funcionando como fallback si no se especifican variables de entorno.
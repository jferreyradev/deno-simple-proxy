# 🔧 Configuración del Deno Simple Proxy

La configuración del proxy se ha modularizado para facilitar el mantenimiento y el despliegue en diferentes ambientes.

## 📁 Estructura de Configuración

```
config.ts          # Configuración centralizada
.env.example       # Plantilla de variables de entorno  
main.ts           # Archivo principal (ahora más limpio)
lib/
├── endpoints.ts  # Handlers especializados
├── server.ts     # Servidor HTTP principal
└── ...
```

## 🚀 Uso Rápido

### 1. **Configuración por Defecto**
```bash
# Funciona sin configuración adicional
deno run --allow-all main.ts

# O usando tareas
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

## 🎯 Endpoints Configurados

### **Oracle Endpoints**
```typescript
/api/oracle/convert  → http://10.6.46.114:8083/exec      # Conversión JSON→SQL
/api/oracle/proc     → http://10.6.46.114:8083/procedure # Operaciones personalizadas
```

### **API Endpoints**
```typescript
/api/validate        → http://10.6.46.114:8082/validate  # Validación
/api/health          → http://10.6.46.114:8080/health    # Health check
```

### **Info Endpoints**
```typescript
/api/info           # Información de la API (interno)
/api/examples       # Ejemplos de uso (interno) 
```

## 🌍 Variables de Entorno

### **Configuración del Servidor**
```bash
# Puerto de escucha
PORT=8003

# Entorno de ejecución  
DENO_ENV=development  # development | production | test
```

### **APIs Oracle**
```bash
# API principal Oracle (para INSERT SQL)
ORACLE_API_URL=http://10.6.46.114:8083/exec
ORACLE_API_TOKEN=Bearer demo

# API Oracle para procedimientos personalizados
PROC_API_URL=http://10.6.46.114:8083/procedure  
PROC_API_TOKEN=Bearer demo
```

### **APIs de Soporte**
```bash
# API de validación
VALIDATE_API_URL=http://10.6.46.114:8082/validate
VALIDATE_API_TOKEN=Bearer demo

# API de health check
HEALTH_API_URL=http://10.6.46.114:8080/health
```

### **Configuración de Transformers**
```bash
# Token para API batch (8081)
API_8081_TOKEN=Bearer tu-token-especifico-aqui

# Token para empresa externa
EMPRESA_API_TOKEN=Bearer your-token-here
```

## ⚙️ Configuración Avanzada

### **1. Configurar Nuevo Endpoint**

**En `config.ts`:**
```typescript
destinationRoutes: [
  // ... endpoints existentes
  {
    pattern: "/api/mi-endpoint",
    description: "Mi endpoint personalizado",
    destination: {
      url: Deno.env.get("MI_API_URL") || "http://mi-servidor:8080/api",
      method: "POST",
      headers: {
        "Authorization": Deno.env.get("MI_API_TOKEN") || "Bearer token",
        "Content-Type": "application/json",
        "X-Source": "deno-oracle-proxy"
      }
    }
  }
]
```

**En `.env`:**
```bash
# Mi endpoint personalizado
MI_API_URL=http://mi-servidor:8080/api
MI_API_TOKEN=Bearer mi-token-especial
```

### **2. Configurar Transformers por Endpoint**

```typescript
endpointTransformers: [
  {
    pattern: "*/mi-endpoint",
    method: "POST",
    headers: {
      "X-Custom-Header": "mi-valor",
      "X-Processing": "custom"
    }
  }
]
```

### **3. Configuración por Entorno**

**Desarrollo:**
```typescript
const developmentConfig: ProxyConfig = {
  port: 8003,
  logger: {
    level: "DEBUG",
    consoleOutput: true
  }
};
```

**Producción:**
```typescript
const productionConfig: ProxyConfig = {
  port: 8080,
  logger: {
    level: "ERROR", 
    consoleOutput: false
  }
};
```

## 📝 Configuración de Logging

### **Logger Principal**
```typescript
logger: {
  logDir: "./logs",
  fileName: "proxy.log",
  level: "INFO",                    # DEBUG | INFO | WARN | ERROR
  maxFileSize: 10 * 1024 * 1024,   # 10MB
  maxBackupFiles: 5,
  includeTimestamp: true,
  consoleOutput: true
}
```

### **Logger SQL**
```typescript
sqlLogger: {
  logDir: "./logs", 
  fileName: "sql-inserts.log",
  maxFileSize: 5 * 1024 * 1024,    # 5MB
  maxBackupFiles: 3
}
```

## 🔧 Configuración de CORS

```typescript
// CORS habilitado por defecto
corsEnabled: true

// Headers CORS automáticos:
"Access-Control-Allow-Origin": "*"
"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
"Access-Control-Allow-Headers": "Content-Type, Authorization"
```

## 🎯 Funciones de Configuración

### **Obtener configuración actual**
```typescript
import { getConfig } from "./config.ts";

const config = getConfig();  // Basado en DENO_ENV
```

### **Configuración específica**
```typescript
import { getConfigForEnvironment } from "./config.ts";

const prodConfig = getConfigForEnvironment("production");
const testConfig = getConfigForEnvironment("test"); 
```

## 📊 Verificar Configuración

### **Ver configuración activa**
```bash
GET http://localhost:8003/api/info

# Respuesta incluye:
{
  "config": {
    "environment": "development",
    "port": 8003,
    "destinationRoutes": [...],
    "endpoints": [...]
  }
}
```

### **Logs de configuración**
```bash
# Al iniciar el servidor:
🌍 Iniciando en modo: development
🎯 Destino configurado para /api/oracle/convert: POST http://10.6.46.114:8083/exec
🎯 Destino configurado para /api/oracle/proc: POST http://10.6.46.114:8083/procedure
🎯 Configurados 5 destinos específicos por endpoint
```

## 🔄 Reconfiguración en Caliente

Algunos aspectos se pueden reconfigurar sin reiniciar:

```bash
# Cambiar transformers
POST /api/config/transformer

# Cambiar endpoint transformers  
POST /api/config/endpoint-transformer

# Ver estadísticas
GET /api/logs/stats
```

**🎯 Configuración centralizada y flexible para todos los entornos!** ⚙️
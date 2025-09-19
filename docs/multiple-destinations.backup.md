# 🎯 Múltiples Destinos por Endpoint

Esta funcionalidad permite configurar diferentes APIs destino según el endpoint que recibe la petición inicial.

## 🚀 Cómo Funciona

Cada endpoint del proxy puede enviar los datos procesados a una API diferente:

```
/api/oracle/convert  → http://10.6.46.114:8083/exec
/api/oracle/batch    → http://10.6.46.114:8081/batch  
/api/validate        → http://10.6.46.114:8082/validate
/api/health         → http://10.6.46.114:8080/health
```

## ⚙️ Configuración

### **1. Variables de Entorno**
```bash
# Destino para SQL Oracle principal
ORACLE_API_URL=http://10.6.46.114:8083/exec
ORACLE_API_TOKEN=Bearer demo

# Destino para operaciones batch
BATCH_API_URL=http://10.6.46.114:8081/batch
BATCH_API_TOKEN=Bearer batch-token

# Destino para validación
VALIDATION_API_URL=http://10.6.46.114:8082/validate
VALIDATION_API_TOKEN=Bearer validation-token

# Destino para health check distribuido
HEALTH_API_URL=http://10.6.46.114:8080/health
```

### **2. Configuración en Código**
```typescript
import { getConfig } from "./config.ts";

const config = getConfig({
  destinationRoutes: [
    {
      pattern: "/api/oracle/convert",
      description: "SQL Oracle principal",
      destination: {
        url: "http://10.6.46.114:8083/exec",
        method: "POST",
        headers: {
          "Authorization": "Bearer demo",
          "Content-Type": "application/json"
        }
      }
    },
    {
      pattern: "/api/oracle/batch",
      description: "Operaciones batch",
      destination: {
        url: "http://10.6.46.114:8081/batch",
        method: "POST",
        headers: {
          "Authorization": "Bearer batch-token",
          "X-Operation": "batch"
        }
      }
    }
  ]
});
```

## 📋 Casos de Uso

### **1. Separación por Tipo de Operación**
```bash
# Operaciones SQL normales → Servidor Oracle principal
POST /api/oracle/convert → http://oracle-main:8083/exec

# Operaciones batch → Servidor optimizado para batch
POST /api/oracle/batch → http://oracle-batch:8081/batch

# Validaciones → Servidor de validación
POST /api/validate → http://validation:8082/validate
```

### **2. Balanceo por Carga**
```bash
# Endpoint A → Servidor 1
POST /api/oracle/convert → http://server1:8083/exec

# Endpoint B → Servidor 2  
POST /api/oracle/heavy → http://server2:8083/exec
```

### **3. Separación por Ambiente**
```bash
# Desarrollo
POST /api/oracle/convert → http://localhost:8083/exec

# Producción
POST /api/oracle/convert → https://api.produccion.com/exec
```

## 🔄 Flujo de Procesamiento

1. **Cliente envía petición** → `POST /api/oracle/convert`
2. **Proxy procesa JSON** → Genera SQL Oracle
3. **Busca destino específico** → Encuentra configuración para `/api/oracle/convert`
4. **Reenvía a destino específico** → `http://10.6.46.114:8083/exec`
5. **Retorna respuesta combinada** → Datos SQL + respuesta del destino

## 🔧 Configuración Avanzada

### **Headers Específicos por Destino**
```typescript
{
  pattern: "/api/oracle/convert",
  destination: {
    url: "http://oracle-server:8083/exec",
    method: "POST",
    headers: {
      "Authorization": "Bearer oracle-token",
      "Content-Type": "application/json",
      "X-Source": "deno-proxy",
      "X-Database": "oracle-main",
      "X-Schema": "production"
    }
  }
}
```

### **Métodos HTTP Diferentes**
```typescript
{
  pattern: "/api/health",
  destination: {
    url: "http://health-server:8080/health",
    method: "GET",  // GET en lugar de POST
    headers: {
      "X-Source": "deno-proxy"
    }
  }
}
```

## 📝 Logs y Monitoreo

El sistema registra qué destino se usa para cada endpoint:

```
🎯 Usando destino específico para /api/oracle/convert: http://10.6.46.114:8083/exec
📦 PAYLOAD ENVIADO A http://10.6.46.114:8083/exec:
📥 RESPUESTA DE http://10.6.46.114:8083/exec (200):
```

## 🔄 Retrocompatibilidad

Si no se configura destino específico para un endpoint, se usa la configuración global:

```typescript
// Destino global (retrocompatibilidad)
destinationApi: {
  url: "http://default-server:8083/exec",
  method: "POST",
  headers: { "Authorization": "Bearer demo" }
}
```

## 🎯 Casos de Ejemplo

### **Desarrollo Local**
```bash
# .env
ORACLE_API_URL=http://localhost:8083/exec
BATCH_API_URL=http://localhost:8081/batch
VALIDATION_API_URL=http://localhost:8082/validate
```

### **Producción**
```bash
# .env
ORACLE_API_URL=https://oracle.empresa.com/api/exec
ORACLE_API_TOKEN=Bearer prod-oracle-token
BATCH_API_URL=https://batch.empresa.com/api/batch
BATCH_API_TOKEN=Bearer prod-batch-token
```

### **Testing**
```bash
# .env
ORACLE_API_URL=http://mock-server:8083/exec
BATCH_API_URL=http://mock-server:8081/batch
VALIDATION_API_URL=http://mock-server:8082/validate
```

Esta funcionalidad te permite tener un proxy inteligente que envía los datos al destino correcto según el endpoint utilizado.
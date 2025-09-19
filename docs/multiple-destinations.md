# 🎯 Múltiples Destinos por Endpoint

Esta funcionalidad permite configurar diferentes APIs destino según el endpoint que recibe la petición inicial.

## 🚀 Cómo Funciona

Cada endpoint del proxy puede enviar los datos procesados a una API diferente:

```
/api/oracle/convert  → http://10.6.46.114:8083/exec        (SQL Oracle principal)
/api/oracle/proc     → http://10.6.46.114:8083/procedure   (Operaciones personalizadas)
/api/validate        → http://10.6.46.114:8082/validate    (Validación de datos)
/api/health          → http://10.6.46.114:8080/health      (Health check distribuido)
```

## ⚙️ Configuración

### **1. Variables de Entorno**
```bash
# Destino para SQL Oracle principal
ORACLE_API_URL=http://10.6.46.114:8083/exec
ORACLE_API_TOKEN=Bearer demo

# Destino para operaciones Oracle personalizadas
PROC_API_URL=http://10.6.46.114:8083/procedure
PROC_API_TOKEN=Bearer demo

# Destino para validación
VALIDATE_API_URL=http://10.6.46.114:8082/validate
VALIDATE_API_TOKEN=Bearer demo

# Destino para health check
HEALTH_API_URL=http://10.6.46.114:8080/health
```

### **2. Configuración en `config.ts`**
```typescript
destinationRoutes: [
  {
    pattern: "/api/oracle/convert",
    description: "SQL Oracle principal",
    destination: {
      url: Deno.env.get("ORACLE_API_URL") || "http://10.6.46.114:8083/exec",
      method: "POST",
      headers: {
        "Authorization": Deno.env.get("ORACLE_API_TOKEN") || "Bearer demo",
        "Content-Type": "application/json"
      }
    }
  },
  {
    pattern: "/api/oracle/proc",
    description: "Procesamiento de datos Oracle",
    destination: {
      url: Deno.env.get("PROC_API_URL") || "http://10.6.46.114:8083/procedure",
      method: "POST",
      headers: {
        "Authorization": Deno.env.get("PROC_API_TOKEN") || "Bearer demo",
        "Content-Type": "application/json",
        "X-Source": "deno-oracle-proxy",
        "X-Operation": "process"
      }
    }
  },
  {
    pattern: "/api/validate",
    description: "Validación de datos",
    destination: {
      url: Deno.env.get("VALIDATE_API_URL") || "http://10.6.46.114:8082/validate",
      method: "POST",
      headers: {
        "Authorization": Deno.env.get("VALIDATE_API_TOKEN") || "Bearer demo",
        "Content-Type": "application/json"
      }
    }
  },
  {
    pattern: "/api/health",
    description: "Health check distribuido",
    destination: {
      url: Deno.env.get("HEALTH_API_URL") || "http://10.6.46.114:8080/health",
      method: "GET",
      headers: {
        "X-Source": "deno-oracle-proxy",
        "X-Check": "distributed"
      }
    }
  }
]
```

## 🎯 Casos de Uso

### **1. Conversión JSON → Oracle SQL**
```bash
POST /api/oracle/convert
# Se reenvía a: http://10.6.46.114:8083/exec
# Función: Ejecutar INSERT SQL generado automáticamente
```

### **2. Operaciones Oracle Personalizadas**
```bash
POST /api/oracle/proc  
# Se reenvía a: http://10.6.46.114:8083/procedure
# Función: Ejecutar procedimientos almacenados, consultas SELECT, etc.
```

### **3. Validación de Datos**
```bash
POST /api/validate
# Se reenvía a: http://10.6.46.114:8082/validate  
# Función: Validar estructura y tipos antes de procesar
```

### **4. Health Check Distribuido**
```bash
GET /api/health
# Se reenvía a: http://10.6.46.114:8080/health
# Función: Verificar estado de toda la infraestructura
```

## 🔧 Agregar Nuevos Destinos

### **Paso 1: Configurar el destino**
```typescript
// En config.ts
{
  pattern: "/api/mi-endpoint",
  description: "Mi descripción",
  destination: {
    url: Deno.env.get("MI_API_URL") || "http://mi-servidor:8080/procesar",
    method: "POST",
    headers: {
      "Authorization": Deno.env.get("MI_API_TOKEN") || "Bearer token",
      "Content-Type": "application/json"
    }
  }
}
```

### **Paso 2: Crear el handler**
```typescript
// En lib/endpoints.ts
export async function miHandler(req: Request): Promise<Response> {
  // Para conversión automática a INSERT:
  return genericOracleHandler(req, "/api/mi-endpoint");
  
  // O para reenvío sin procesar:
  const data = await req.json();
  return new Response(JSON.stringify({
    success: true,
    receivedData: data,
    willForwardTo: "mi destino configurado"
  }));
}
```

### **Paso 3: Registrar la ruta**
```typescript
// En lib/server.ts
import { miHandler } from "./endpoints.ts";
router.post("/api/mi-endpoint", miHandler);
```

## 📊 Monitoreo de Destinos

### **Ver destinos configurados**
```bash
GET /api/info
# Respuesta incluye lista de todos los destinos configurados
```

### **Logs de reenvío**
```bash
# Los logs muestran el destino usado para cada petición:
🎯 Usando destino específico para /api/oracle/convert: http://10.6.46.114:8083/exec
📤 Enviando petición: POST http://10.6.46.114:8083/exec
📥 Respuesta recibida: 200 OK (150ms)
```

## 🌍 Configuración por Entorno

```typescript
// Desarrollo
const developmentConfig = {
  destinationRoutes: [
    {
      pattern: "/api/oracle/convert",
      destination: { url: "http://localhost:8083/exec" }
    }
  ]
};

// Producción  
const productionConfig = {
  destinationRoutes: [
    {
      pattern: "/api/oracle/convert", 
      destination: { url: "https://oracle-prod.empresa.com/exec" }
    }
  ]
};
```

## 🔄 Flujo Completo

```
1. 📥 Cliente → POST /api/oracle/convert
2. 🔍 Proxy busca destino configurado para patrón "/api/oracle/convert"
3. 🔄 Proxy procesa JSON → SQL (si aplica)
4. 🎯 Proxy reenvía a: http://10.6.46.114:8083/exec
5. 📨 API destino procesa y responde
6. 📊 Proxy consolida respuesta + logs
7. 📤 Cliente recibe respuesta final
```

**🎯 Cada endpoint tiene su destino específico para máxima flexibilidad!** 🚀
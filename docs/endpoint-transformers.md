# 🎯 Transformaciones por Endpoint

El sistema ahora soporta **transformaciones específicas por endpoint**, permitiendo que cada API destino reciba el payload en el formato que necesite.

## 📋 Funcionalidades

### 1. **Configuración por Patrones de URL**
```typescript
// Ejemplos de patrones
"*/exec"                    // Cualquier URL que termine en /exec
"localhost:*"               // Cualquier puerto en localhost  
"*api.empresa.com*"         // Cualquier subdominio de api.empresa.com
"http://10.6.46.114:*"      // IP específica con cualquier puerto
"*:8081/*"                  // Puerto específico con cualquier host
```

### 2. **Configuración de Métodos HTTP y Headers**
```typescript
setEndpointTransformer(
  "*/api/sql",
  transformerFunction,
  {
    method: "PUT",              // Cambiar método HTTP
    headers: {                  // Headers específicos
      "Authorization": "Bearer token",
      "X-API-Version": "v2",
      "Content-Type": "application/sql"
    }
  }
);
```

## 🚀 Ejemplos de Uso

### **Configuración en `main.ts`**

```typescript
// Endpoint para ejecución directa de SQL
setEndpointTransformer(
  "*/exec",
  (sqlData, originalData) => {
    if (sqlData.inputType === "object") {
      return {
        action: "execute",
        sql: sqlData.insert,
        table: sqlData.tableName
      };
    }
    return {
      action: "batch_execute", 
      statements: sqlData.tables.flatMap(t => t.inserts)
    };
  }
);

// API de desarrollo local
setEndpointTransformer(
  "localhost:*",
  (sqlData, originalData) => ({
    env: "dev",
    debug: true,
    sql: sqlData,
    original: originalData
  })
);
```

### **Configuración Dinámica via API**

```bash
# Configurar transformer para endpoint específico
curl -X POST http://localhost:8003/api/config/endpoint-transformer \
  -H "Content-Type: application/json" \
  -d '{
    "endpointPattern": "*/database/insert",
    "transformerCode": "(sqlData, originalData) => ({ query: sqlData.insert, data: originalData })",
    "method": "PUT",
    "headers": {
      "Authorization": "Bearer mi-token",
      "X-Source": "proxy"
    }
  }'
```

```bash
# Listar todos los transformers configurados
curl http://localhost:8003/api/config/transformers
```

## 📊 Ejemplos de Formatos por Endpoint

### **Formato para `/exec` endpoints**
```json
{
  "action": "execute",
  "sql": "INSERT INTO usuarios (id, nombre) VALUES (1, 'Juan')",
  "table": "usuarios",
  "timestamp": "2025-09-18T13:00:00.000Z"
}
```

### **Formato para APIs empresariales**
```json
{
  "companyFormat": true,
  "data": {
    "sql": ["INSERT INTO empleados..."],
    "metadata": {
      "generated": "2025-09-18T13:00:00.000Z",
      "source": "oracle-proxy",
      "version": "1.0"
    }
  }
}
```

### **Formato para desarrollo local**
```json
{
  "environment": "development",
  "timestamp": "2025-09-18T13:00:00.000Z",
  "source": "deno-proxy-local",
  "payload": {
    "originalRequest": {...},
    "generatedSQL": {...},
    "debug": {
      "inputType": "object",
      "sqlCount": 1
    }
  }
}
```

## 🔄 Prioridad de Transformadores

1. **Transformer específico por endpoint** (mayor prioridad)
2. **Transformer global** (`setPayloadTransformer`)
3. **Formato por defecto** (menor prioridad)

## ⚙️ Gestión de Transformers

### **Listar transformers activos**
```bash
GET http://localhost:8003/api/config/transformers
```

### **Configurar transformer global**
```bash
POST http://localhost:8003/api/config/transformer
{
  "transformerCode": "(sqlData, originalData) => ({ global: sqlData })"
}
```

### **Configurar transformer por endpoint**
```bash
POST http://localhost:8003/api/config/endpoint-transformer
{
  "endpointPattern": "*/mi-api/*",
  "transformerCode": "(sqlData, originalData) => ({ custom: sqlData })",
  "method": "POST",
  "headers": { "X-Custom": "true" }
}
```

## 📝 Casos de Uso Comunes

### **1. APIs con diferentes formatos de autenticación**
```typescript
// API con Bearer token
setEndpointTransformer("*prod-api.com*", transformer, {
  headers: { "Authorization": "Bearer prod-token" }
});

// API con API Key
setEndpointTransformer("*dev-api.com*", transformer, {
  headers: { "X-API-Key": "dev-key" }
});
```

### **2. Diferentes métodos HTTP**
```typescript
// Algunas APIs requieren PUT en lugar de POST
setEndpointTransformer("*/database/upsert", transformer, {
  method: "PUT"
});
```

### **3. Formatos de payload específicos**
```typescript
// API que solo acepta array de SQL strings
setEndpointTransformer("*/bulk-insert", (sqlData) => {
  return sqlData.inputType === "object" ? 
    [sqlData.insert] : 
    sqlData.tables.flatMap(t => t.inserts);
});
```

¡Con este sistema puedes configurar un formato diferente para cada API destino que uses! 🎯
# 🚀 Deno Simple Proxy - Oracle Edition

Servidor proxy construido con Deno que convierte JSON a statements INSERT de Oracle y reenvía peticiones a APIs específicas.

## ✨ Características principales

- ✅ **Conversión automática** de JSON a SQL INSERT de Oracle
- ✅ **Endpoints Oracle especializados** para diferentes operaciones
- ✅ **Configuración centralizada** con variables de entorno
- ✅ **Soporte completo CORS** - funciona desde navegadores web
- ✅ **Logging avanzado** con rotación de archivos
- ✅ **Reenvío automático** a APIs destino configurables
- ✅ **Arquitectura modular** - fácil mantenimiento y extensión

## 🎯 Endpoints disponibles

### 📝 Endpoints de información
- `GET /api/health` - Estado del servidor y health check distribuido
- `GET /api/info` - Información de la API y configuración
- `GET /api/examples` - Ejemplos de uso de todos los endpoints

### 🔧 Endpoints Oracle
- `POST /api/oracle/convert` - **Convierte JSON → INSERT SQL** y reenvía
- `POST /api/oracle/proc` - **Reenvía JSON sin procesar** para operaciones personalizadas
- `POST /api/validate` - Validación de datos antes de procesar

## 🚀 Inicio rápido

### 1. Configurar variables de entorno (opcional)
```bash
# Crear .env (opcional - tiene valores por defecto)
cp .env.example .env
```

### 2. Iniciar el servidor
```bash
# Desarrollo
deno run --allow-all main.ts

# O usando las tareas definidas
deno task start

# Modo desarrollo con watch
deno task dev
```

### 3. El servidor estará disponible en:
```
http://localhost:8003
```

## 📖 Guía de uso

### 🔧 Endpoint principal: `/api/oracle/convert`

**Convierte JSON a INSERT SQL y reenvía a Oracle**

```bash
POST http://localhost:8003/api/oracle/convert
Content-Type: application/json
```

#### Ejemplo 1: Objeto individual
```json
{
  "tableName": "usuarios",
  "id": 1,
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "edad": 30,
  "activo": true
}
```

**Respuesta:**
```json
{
  "success": true,
  "inputType": "object",
  "tableName": "usuarios",
  "insert": "INSERT INTO usuarios (id, nombre, email, edad, activo) VALUES (1, 'Juan Pérez', 'juan@email.com', 30, 1);",
  "createTable": "CREATE TABLE usuarios (...)",
  "forwardResponse": {
    "status": 200,
    "data": "Datos procesados en Oracle"
  }
}
```

#### Ejemplo 2: Array con múltiples tablas
```json
[
  {
    "tableName": "ganancias.Empleado",
    "idEmpleado": 5525,
    "nombre": "MARIA CONSTANZA",
    "apellido": "CAINZO",
    "cuit": "27310016719"
  },
  {
    "tableName": "ganancias.Presentacion",
    "idPresentacion": 5525,
    "periodo": 2025,
    "idEmpleado": 5525,
    "fechaPresentacion": "25-08-2025"
  }
]
```

**Respuesta:**
```json
{
  "success": true,
  "inputType": "array",
  "tables": [
    {
      "tableName": "ganancias.Empleado",
      "recordCount": 1,
      "inserts": ["INSERT INTO ganancias.Empleado (...)"]
    },
    {
      "tableName": "ganancias.Presentacion", 
      "recordCount": 1,
      "inserts": ["INSERT INTO ganancias.Presentacion (...)"]
    }
  ],
  "forwardResponse": {
    "status": 200,
    "data": "Procesado en Oracle"
  }
}
```

### 🎯 Endpoint personalizado: `/api/oracle/proc`

**Reenvía JSON sin convertir a INSERT (para operaciones personalizadas)**

```bash
POST http://localhost:8003/api/oracle/proc
Content-Type: application/json
```

```json
{
  "operation": "execute_procedure",
  "procedure": "sp_procesar_datos",
  "parameters": ["param1", "param2", 123]
}
```

**Respuesta:**
```json
{
  "success": true,
  "endpoint": "/api/oracle/proc",
  "message": "Datos procesados - listos para reenvío",
  "receivedData": { "operation": "execute_procedure", ... },
  "willForwardTo": "http://10.6.46.114:8083/procedure"
}
```

## ⚙️ Configuración

### 🎯 Destinos por endpoint

| Endpoint | Destino por defecto | Función |
|----------|-------------------|---------|
| `/api/oracle/convert` | `http://10.6.46.114:8083/exec` | Ejecuta INSERT SQL |
| `/api/oracle/proc` | `http://10.6.46.114:8083/procedure` | Ejecuta procedimientos |
| `/api/validate` | `http://10.6.46.114:8082/validate` | Validación de datos |
| `/api/health` | `http://10.6.46.114:8080/health` | Health check |

### 🌍 Variables de entorno

```bash
# Puerto del servidor
PORT=8003

# URLs de destino Oracle
ORACLE_API_URL=http://10.6.46.114:8083/exec
PROC_API_URL=http://10.6.46.114:8083/procedure
VALIDATE_API_URL=http://10.6.46.114:8082/validate

# Tokens de autorización
ORACLE_API_TOKEN=Bearer tu-token-aqui
PROC_API_TOKEN=Bearer tu-token-aqui
VALIDATE_API_TOKEN=Bearer tu-token-aqui

# Configuración de entorno
DENO_ENV=development  # development | production | test
```

## 📝 Logs y monitoreo

### 📊 Archivos de log
- `./logs/proxy.log` - Log general del servidor
- `./logs/sql-inserts.log` - Log específico de operaciones SQL

### 🔍 Endpoints de monitoreo
- `GET /api/logs/stats` - Estadísticas de logs
- `GET /api/logs/sql/search?query=texto` - Buscar en logs SQL

## 🔧 Tipos de datos Oracle soportados

| Tipo JavaScript | Tipo Oracle | Ejemplo |
|----------------|-------------|---------|
| `string` | `VARCHAR2(4000)` | `'texto'` |
| `number` (entero) | `NUMBER` | `123` |
| `number` (decimal) | `NUMBER(15,2)` | `123.45` |
| `boolean` | `CHAR(1)` | `'Y'` o `'N'` |
| `date string` | `DATE` | `TO_DATE('25-08-2025', 'DD-MM-YYYY')` |
| `null` | `NULL` | `NULL` |

## 🌐 CORS y navegadores

El servidor tiene CORS completamente habilitado. Puedes usarlo directamente desde:
- Navegadores web con JavaScript
- Aplicaciones React/Vue/Angular
- Herramientas como Postman
- Scripts curl

## 🔄 Flujo de procesamiento

```
1. 📤 Cliente envía JSON → http://localhost:8003/api/oracle/convert
2. 🔄 Proxy convierte JSON → SQL INSERT de Oracle  
3. 🎯 Proxy reenvía SQL → http://10.6.46.114:8083/exec
4. 📥 Oracle procesa → Resultado de la operación
5. 📊 Proxy devuelve → Respuesta consolidada + logs
```

## 🚦 Códigos de respuesta

- `200` - ✅ Operación exitosa
- `400` - ❌ JSON inválido o datos incorrectos
- `500` - ❌ Error en el servidor destino o proxy
- `404` - ❌ Endpoint no encontrado

## 🛠️ Desarrollo

### Estructura del proyecto
```
deno-simple-proxy/
├── main.ts              # Punto de entrada
├── config.ts            # Configuración centralizada
├── lib/
│   ├── endpoints.ts     # Handlers de endpoints
│   ├── server.ts        # Servidor HTTP principal
│   ├── router.ts        # Sistema de rutas
│   ├── oracle.ts        # Lógica de conversión Oracle
│   ├── logger.ts        # Sistema de logging
│   └── types.ts         # Tipos TypeScript
└── logs/                # Archivos de log
```

### Agregar nuevos endpoints

1. **Configurar en `config.ts`:**
```typescript
{
  pattern: "/api/mi-endpoint",
  description: "Mi descripción",
  destination: {
    url: "http://mi-servidor:8080/procesar",
    method: "POST",
    headers: { "Authorization": "Bearer token" }
  }
}
```

2. **Crear handler en `lib/endpoints.ts`:**
```typescript
export async function miHandler(req: Request): Promise<Response> {
  // Tu lógica aquí
}
```

3. **Registrar en `lib/server.ts`:**
```typescript
import { miHandler } from "./endpoints.ts";
router.post("/api/mi-endpoint", miHandler);
```

## 📋 Ejemplos prácticos

### Insertar empleado y presentación
```bash
curl -X POST http://localhost:8003/api/oracle/convert \
  -H "Content-Type: application/json" \
  -d '[{
    "tableName": "ganancias.Empleado",
    "idEmpleado": 5525,
    "cuit": "27310016719",
    "apellido": "CAINZO",
    "nombre": "MARIA CONSTANZA"
  }, {
    "tableName": "ganancias.Presentacion",
    "idPresentacion": 5525,
    "periodo": 2025,
    "nroPresentacion": 8,
    "fechaPresentacion": "25-08-2025"
  }]'
```

### Ejecutar operación personalizada
```bash
curl -X POST http://localhost:8003/api/oracle/proc \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "consultar_empleado",
    "parametros": {
      "idEmpleado": 5525,
      "incluirPresentaciones": true
    }
  }'
```

### Validar datos antes de procesar
```bash
curl -X POST http://localhost:8003/api/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "usuarios",
    "data": {
      "email": "test@email.com",
      "edad": 25
    }
  }'
```

---

**🎯 Proxy listo para convertir tu JSON a SQL Oracle y mucho más!** 🚀
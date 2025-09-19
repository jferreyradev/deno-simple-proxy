# 🚀 Deno Proxy con Generación de SQL para Oracle

Servidor proxy construido con Deno que convierte JSON a statements INSERT de Oracle. Soporta objetos individuales y arrays con múltiples tablas.

## ✨ Características

- ✅ **Conversión automática** de JSON a SQL INSERT de Oracle
- ✅ **Manejo de arrays** con múltiples tablas usando campo `tableName`
- ✅ **Generación de CREATE TABLE** basado en tipos de datos (solo en respuesta JSON)
- ✅ **BATCH INSERT** (INSERT ALL) para mejor rendimiento
- ✅ **Tipos de datos Oracle** correctos (VARCHAR2, NUMBER, DATE, CLOB)
- ✅ **Escapado de caracteres** para prevenir errores SQL
- ✅ **Soporte completo CORS** - funciona desde navegadores web
- ✅ **Reenvío automático** a APIs destino
- ✅ **Arquitectura modular** - fácil mantenimiento

## ⚠️ Requisitos Importantes

### Tablas deben existir previamente

**El sistema genera SOLO INSERT statements** - las tablas deben estar creadas previamente en la base de datos Oracle.

**Para evitar errores ORA-00942** (table or view does not exist):

1. **Crea las tablas manualmente** antes de usar el proxy
2. **Usa los CREATE TABLE generados** (disponibles en la respuesta JSON) 
3. **Verifica que los nombres de tabla** coincidan exactamente

**Ejemplo de flujo recomendado**:
```bash
# 1. Enviar JSON al proxy para obtener CREATE TABLE
POST /api/oracle/convert
{
  "tableName": "usuarios",
  "id": 1,
  "nombre": "Juan"
}

# 2. Usar el CREATE TABLE generado en la respuesta
# response.createTable: "CREATE TABLE usuarios (id NUMBER(10), nombre VARCHAR2(4000))"

# 3. Ejecutar CREATE TABLE en Oracle primero
# 4. Luego usar el INSERT generado
# response.insert: "INSERT INTO usuarios (id, nombre) VALUES (1, 'Juan')"
```

##  Uso Rápido

### 1. Iniciar el servidor
```bash
deno run --allow-net --allow-write main.ts
# o usando las tareas definidas
deno task start

# Modo desarrollo (con watch)
deno task dev
```

### 2. Enviar JSON
```bash
# POST a http://localhost:8003
# Content-Type: application/json

# Ejemplo 1: Objeto individual
{
  "tableName": "usuarios",
  "id": 1,
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "edad": 30,
  "activo": true
}

# Ejemplo 2: Array con múltiples tablas
[
  {
    "tableName": "Empleado",
    "idEmpleado": 1,
    "nombre": "MARIA CONSTANZA",
    "apellido": "CAINZO",
    "cuit": "27310016719"
  },
  {
    "tableName": "Presentacion",
    "idPresentacion": 1,

**Respuesta:**    "periodo": 2025,

```json    "idEmpleado": 1,

{    "fechaPresentacion": "25-08-2025"

  "success": true,  }

  "inputType": "object",]

  "tableName": "usuarios",```

  "insert": "INSERT INTO usuarios (id, nombre, email, edad, activo) VALUES (1, 'Juan Pérez', 'juan@email.com', 30, 1);",

  "createTable": "CREATE TABLE usuarios (...)",### 3. Recibir SQL de Oracle

  "generatedAt": "2025-09-18T...",```sql

  "forwarded": {-- Para objeto individual

    "success": false,INSERT INTO usuarios (id, nombre, email, edad, activo) 

    "response": null,VALUES (1, 'Juan Pérez', 'juan@email.com', 30, 'Y');

    "destinationUrl": null

  }-- Para arrays (agrupado por tabla)

}INSERT INTO Empleado (idEmpleado, nombre, apellido, cuit) 

```VALUES (1, 'MARIA CONSTANZA', 'CAINZO', '27310016719');



**Ejemplo - Array con Múltiples Tablas:**INSERT INTO Presentacion (idPresentacion, periodo, idEmpleado, fechaPresentacion) 

```bashVALUES (1, 2025, 1, '25-08-2025');

curl -X POST http://localhost:8003/api/oracle/convert \```

  -H "Content-Type: application/json" \

  -d '[## 🌐 Test desde Navegador Web

    {"tableName": "empleados", "nombre": "Ana García", "puesto": "Developer"},

    {"tableName": "departamentos", "nombre": "IT", "presupuesto": 100000}### Opción 1: Archivo HTML incluido

  ]'1. Ejecutar: `deno run --allow-net main.ts`

```2. Abrir `test-cors.html` en tu navegador

3. Probar diferentes ejemplos de JSON

### 🏥 GET `/api/health`

Estado de salud del servidor### Opción 2: Desde JavaScript

```javascript

```bashfetch('http://localhost:8003', {

curl http://localhost:8003/api/health  method: 'POST',

```  headers: { 'Content-Type': 'application/json' },

  body: JSON.stringify({

**Respuesta:**    tableName: "productos",

```json    nombre: "Laptop",

{    precio: 999.99

  "status": "healthy",  })

  "service": "Deno Oracle Proxy",})

  "version": "1.0.0",.then(response => response.json())

  "timestamp": "2025-09-18T...",.then(data => console.log('SQL generado:', data));

  "uptime": 1234,```

  "memory": {...}

}## 📋 Ejemplos con Postman

```

### Configuración

### 📋 GET `/api/info`1. **Método**: POST

Información completa de la API2. **URL**: `http://localhost:8003`

3. **Headers**: 

```bash   - `Content-Type: application/json`

curl http://localhost:8003/api/info4. **Body**: Raw → JSON

```

### Ejemplo 1: Usuario simple

### 📚 GET `/api/examples````json

Ejemplos de uso detallados{

  "tableName": "usuarios",

```bash  "id": 1,

curl http://localhost:8003/api/examples  "nombre": "Ana García",

```  "email": "ana@empresa.com",

  "departamento": "IT",

### 🔍 POST `/api/validate`  "salario": 75000.50,

Valida estructura JSON antes de conversión  "fecha_ingreso": "2024-01-15"

}

```bash```

curl -X POST http://localhost:8003/api/validate \

  -H "Content-Type: application/json" \**Respuesta:**

  -d '{"tableName": "test", "campo": "valor"}'```json

```{

  "success": true,

## ⚙️ Configuración  "inputType": "object",

  "tableName": "usuarios",

### CORS  "insert": "INSERT INTO usuarios (id, nombre, email, departamento, salario, fecha_ingreso) VALUES (1, 'Ana García', 'ana@empresa.com', 'IT', 75000.5, '2024-01-15');",

```typescript  "createTable": "CREATE TABLE usuarios (\n  ID NUMBER(10),\n  NOMBRE VARCHAR2(4000),\n  EMAIL VARCHAR2(4000),\n  DEPARTAMENTO VARCHAR2(4000),\n  SALARIO NUMBER(10,2),\n  FECHA_INGRESO VARCHAR2(4000)\n);",

import { setCorsConfig } from "./lib/server.ts";  "generatedAt": "2025-09-18T...",

  "forwarded": {

setCorsConfig({    "success": false,

  origins: ["http://localhost:3000", "https://miapp.com"],    "response": null,

  methods: ["GET", "POST", "OPTIONS"],    "destinationUrl": null

  headers: ["Content-Type", "Authorization"],  }

  credentials: true}

});```

```

## 🛠️ Tipos de Datos Soportados

### Reenvío a API Externa

```typescript| Tipo JSON | Tipo Oracle | Ejemplo |

import { setDestinationAPI } from "./lib/server.ts";|-----------|-------------|---------|

| `string` | `VARCHAR2(4000)` | `'Juan Pérez'` |

setDestinationAPI("https://mi-api.com/webhook");| `number` (entero) | `NUMBER(10)` | `123` |

```| `number` (decimal) | `NUMBER(10,2)` | `123.45` |

| `boolean` | `CHAR(1)` | `'Y'` o `'N'` |

## 🔧 Tipos de Datos Soportados| `object/array` | `CLOB` | `'{"key":"value"}'` |

| `null` | `NULL` | `NULL` |

| Tipo JavaScript | Tipo Oracle SQL |

|-----------------|-----------------|## 🎯 Funcionalidades Avanzadas

| `string` | `VARCHAR2(4000)` |

| `number` | `NUMBER` |### 1. INSERT Individuales

| `boolean` | `NUMBER(1)` |Cada objeto genera un statement INSERT separado.

| `Date` | `DATE` |

| `null` | `NULL` |### 2. CREATE TABLE Automático

Se genera automáticamente basado en los tipos de datos del JSON.

## 📁 Estructura del Proyecto

### 3. BATCH INSERT (INSERT ALL)

```Para arrays con la misma tabla, se genera un INSERT ALL optimizado:

deno-simple-proxy/

├── lib/```sql

│   ├── endpoints.ts    # Handlers de endpointsINSERT ALL

│   ├── oracle.ts       # Lógica de conversión SQL  INTO empleados (id, nombre, puesto) VALUES (1, 'Carlos López', 'Developer')

│   ├── router.ts       # Sistema de routing  INTO empleados (id, nombre, puesto) VALUES (2, 'María Silva', 'Designer')

│   ├── server.ts       # Servidor HTTP y CORSSELECT * FROM dual;

│   └── types.ts        # Tipos TypeScript```

├── main.ts            # Punto de entrada

├── deno.json          # Configuración de Deno### 4. Reenvío a API Destino

└── README.md          # DocumentaciónConfigura una URL para reenviar automáticamente el SQL generado:

```

```typescript

## 🌐 Uso desde Navegadorimport { setDestinationAPI } from "./lib/server.ts";

setDestinationAPI("https://tu-api.com/sql-endpoint");

El servidor incluye soporte completo para CORS, permitiendo uso directo desde navegadores:```



```javascript### 5. Configuración CORS

// Desde el navegadorControla qué dominios pueden acceder al proxy:

const response = await fetch('http://localhost:8003/api/oracle/convert', {

  method: 'POST',```typescript

  headers: {import { setCorsConfig } from "./lib/server.ts";

    'Content-Type': 'application/json'setCorsConfig({

  },  origins: ["https://tu-frontend.com"],

  body: JSON.stringify({  credentials: true

    tableName: 'productos',});

    nombre: 'Laptop',```

    precio: 999.99

  })## 📁 Documentación Adicional

});

- 📖 **[ARCHITECTURE.md](ARCHITECTURE.md)** - Estructura modular del proyecto

const result = await response.json();- 🔒 **[CORS.md](CORS.md)** - Configuración detallada de CORS

console.log(result.insert); // INSERT SQL generado- 🚀 **[FORWARDING.md](FORWARDING.md)** - Reenvío a APIs externas

```

## 🔧 Estructura del Proyecto

## 🔀 Casos de Uso

```

### 1. **Migración de Datos**deno-simple-proxy/

Convierte datos de APIs REST a formato Oracle para migración de bases de datos.├── main.ts              # 🚀 Punto de entrada

├── lib/                 # 📚 Módulos

### 2. **ETL en Tiempo Real**│   ├── types.ts         # 📊 Interfaces TypeScript

Integra con pipelines de datos para transformación automática JSON → Oracle.│   ├── oracle.ts        # 🔧 Lógica SQL Oracle

│   └── server.ts        # 🌐 Servidor HTTP + CORS

### 3. **Desarrollo y Testing**├── test-cors.html       # 🧪 Test visual CORS

Genera rápidamente SQL de prueba desde objetos JavaScript.├── main-with-forwarding.ts # 📤 Ejemplo con reenvío

├── mock-api.ts          # 🎭 API mock para testing

### 4. **APIs Híbridas**└── README.md           # 📖 Esta documentación

Combina servicios REST modernos con bases de datos Oracle legacy.```



## 🚀 Deployment## 📝 Logs del Servidor



### Con DockerEl servidor muestra información detallada:

```dockerfile

FROM denoland/deno:latest```

WORKDIR /app🔒 CORS habilitado por defecto para todos los orígenes

COPY . .🌐 El proxy puede ser usado desde cualquier navegador web

RUN deno cache main.ts🚀 Proxy Deno escuchando en http://localhost:8003

EXPOSE 8003📝 Envía POST con JSON para generar SQL de Oracle

CMD ["deno", "run", "--allow-net", "main.ts"]💡 Ejemplos:

```   • Objeto: { "tableName": "usuarios", "nombre": "Juan" }

   • Array: [{ "tableName": "tabla1", "campo": "valor" }]

### Con Deno Deploy

```bash✅ JSON recibido: { tableName: "usuarios", nombre: "Juan" }

deno deploy --project=mi-proyecto main.ts✅ Procesando objeto individual

```📊 SQL generado: INSERT INTO usuarios (nombre) VALUES ('Juan');

```

## 🤝 Contribuir

## 🚨 Solución de Problemas

1. Fork el proyecto

2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)### Error: "blocked by CORS policy"

3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)- ✅ **Solución**: El proxy ya incluye CORS habilitado por defecto

4. Push a la rama (`git push origin feature/AmazingFeature`)- ✅ **Personalizar**: Usar `setCorsConfig()` para dominios específicos

5. Abre un Pull Request

### Error: "Solo se acepta POST con Content-Type: application/json"

## 📄 Licencia- ✅ Verifica que uses método POST

- ✅ Asegúrate de incluir header `Content-Type: application/json`

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.

### Error: "Unexpected end of JSON input"

## 🙏 Créditos- ✅ Verifica que el JSON esté bien formado

- ✅ En Postman: Body → Raw → JSON (no Text)

- Construido con [Deno](https://deno.land/)

- Desarrollado por GitHub Copilot### Error de conexión

- Oracle SQL generation engine- ✅ Verifica que el servidor esté corriendo: `deno run --allow-net main.ts`
- ✅ El servidor debe mostrar: "🚀 Proxy Deno escuchando en http://localhost:8003"

## 🎉 ¡Listo para usar!

Tu proxy está configurado y listo para:
- ✅ **Convertir JSON a Oracle SQL** desde cualquier aplicación
- ✅ **Funcionar desde navegadores web** sin problemas de CORS
- ✅ **Reenviar SQL automáticamente** a sistemas externos
- ✅ **Integrarse fácilmente** con aplicaciones React, Vue, Angular

**¡Perfecto para integrar con sistemas existentes y aplicaciones web modernas!** 🚀

## 🔧 Endpoint de Procedimientos Almacenados

### POST `/api/oracle/procedure`

Ejecuta procedimientos almacenados de Oracle con parámetros.

#### 📤 Procedimiento Individual

```bash
curl -X POST http://localhost:8003/api/oracle/procedure \
  -H "Content-Type: application/json" \
  -d '{
    "procedureName": "ganancias.ActualizarEmpleado",
    "parameters": {
      "p_id": 9999,
      "p_nombre": "MARIA CONSTANZA",
      "p_apellido": "CAINZO",
      "p_activo": true
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "inputType": "procedure",
  "procedureName": "ganancias.ActualizarEmpleado",
  "call": "BEGIN\n  GANANCIAS.ACTUALIZAREMPLEADO(p_id => 9999, p_nombre => 'MARIA CONSTANZA', p_apellido => 'CAINZO', p_activo => 'Y');\nEND;",
  "generatedAt": "2025-09-19T17:58:00.000Z"
}
```

#### 📤 Procedimiento en Paquete (esquema.paquete.procedimiento)

```bash
curl -X POST http://localhost:8003/api/oracle/procedure \
  -H "Content-Type: application/json" \
  -d '{
    "procedureName": "workflow.controles.CARGARESUMENLIQ",
    "parameters": {
      "vPERIODO": "01-09-2025",
      "vIDTIPOLIQ": 1,
      "vIDGRUPO": 0,
      "vGRUPOREP": 9
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "inputType": "procedure",
  "procedureName": "workflow.controles.CARGARESUMENLIQ",
  "call": "BEGIN\n  WORKFLOW.CONTROLES.CARGARESUMENLIQ(vPERIODO => TO_DATE('01-09-2025', 'DD-MM-YYYY'), vIDTIPOLIQ => 1, vIDGRUPO => 0, vGRUPOREP => 9);\nEND;",
  "generatedAt": "2025-09-19T18:15:00.000Z"
}
```

#### 📤 Múltiples Procedimientos

```bash
curl -X POST http://localhost:8003/api/oracle/procedure \
  -H "Content-Type: application/json" \
  -d '[
    {
      "procedureName": "ganancias.InsertarEmpleado",
      "parameters": {
        "p_nombre": "Juan Perez",
        "p_email": "juan@empresa.com"
      }
    },
    {
      "procedureName": "auditoria.RegistrarAcceso",
      "parameters": {
        "p_usuario": "admin",
        "p_fecha": "19-09-2025"
      }
    }
  ]'
```

**Respuesta:**
```json
{
  "success": true,
  "inputType": "multiple-procedures",
  "procedures": [
    { "procedureName": "ganancias.InsertarEmpleado", "parameterCount": 2 },
    { "procedureName": "auditoria.RegistrarAcceso", "parameterCount": 2 }
  ],
  "call": "BEGIN\n  GANANCIAS.INSERTAREMPLEADO(p_nombre => 'Juan Perez', p_email => 'juan@empresa.com');\n  AUDITORIA.REGISTRARACCESO(p_usuario => 'admin', p_fecha => '19-09-2025');\n  COMMIT;\nEND;",
  "summary": {
    "totalProcedures": 2,
    "generatedAt": "2025-09-19T17:58:00.000Z"
  }
}
```

#### 🎯 Características del Endpoint de Procedimientos

- ✅ **Soporte esquema.procedimiento**: `ganancias.ActualizarEmpleado`
- ✅ **Soporte paquetes**: `workflow.controles.CARGARESUMENLIQ`
- ✅ **Formatos válidos**: `procedimiento`, `esquema.procedimiento`, `esquema.paquete.procedimiento`
- ✅ **Parámetros nombrados**: `p_id => 9999`
- ✅ **Tipos automáticos**: Strings, Numbers, Dates, Booleans
- ✅ **Múltiples procedimientos**: Ejecución en transacción
- ✅ **Validación**: Nombres y parámetros válidos
- ✅ **Bloques PL/SQL**: `BEGIN ... END;` listos para Oracle

#### 🔄 Reenvío Automático

El procedimiento generado se reenvía automáticamente a la URL configurada que termine en `/procedimiento`:

```
http://10.6.46.114:8083/procedimiento
```

El payload enviado será:
```json
{
  "query": "BEGIN\n  GANANCIAS.ACTUALIZAREMPLEADO(p_id => 9999, ...);\nEND;"
}
```
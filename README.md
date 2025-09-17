# 🚀 Deno Proxy con Generación de SQL para Oracle

Servidor proxy construido con Deno que convierte JSON a statements INSERT de Oracle. Soporta objetos individuales y arrays con múltiples tablas.

## ✨ Características

- ✅ **Conversión automática** de JSON a SQL INSERT de Oracle
- ✅ **Manejo de arrays** con múltiples tablas usando campo `tableName`
- ✅ **Generación de CREATE TABLE** basado en tipos de datos
- ✅ **BATCH INSERT** (INSERT ALL) para mejor rendimiento
- ✅ **Tipos de datos Oracle** correctos (VARCHAR2, NUMBER, DATE, CLOB)
- ✅ **Escapado de caracteres** para prevenir errores SQL

## 🚀 Uso Rápido

### 1. Iniciar el servidor
```bash
deno run --allow-net main.ts
```

### 2. Enviar JSON
```bash
# POST a http://localhost:8003
Content-Type: application/json

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
    "periodo": 2025,
    "idEmpleado": 1,
    "fechaPresentacion": "25-08-2025"
  }
]
```

### 3. Recibir SQL de Oracle
```sql
-- Para objeto individual
INSERT INTO usuarios (id, nombre, email, edad, activo) 
VALUES (1, 'Juan Pérez', 'juan@email.com', 30, 'Y');

-- Para arrays (agrupado por tabla)
INSERT INTO Empleado (idEmpleado, nombre, apellido, cuit) 
VALUES (1, 'MARIA CONSTANZA', 'CAINZO', '27310016719');

INSERT INTO Presentacion (idPresentacion, periodo, idEmpleado, fechaPresentacion) 
VALUES (1, 2025, 1, '25-08-2025');
```

## 📋 Ejemplos con Postman

### Configuración
1. **Método**: POST
2. **URL**: `http://localhost:8003`
3. **Headers**: 
   - `Content-Type: application/json`
4. **Body**: Raw → JSON

### Ejemplo 1: Usuario simple
```json
{
  "tableName": "usuarios",
  "id": 1,
  "nombre": "Ana García",
  "email": "ana@empresa.com",
  "departamento": "IT",
  "salario": 75000.50,
  "fecha_ingreso": "2024-01-15"
}
```

**Respuesta:**
```json
{
  "success": true,
  "inputType": "object",
  "tableName": "usuarios",
  "insert": "INSERT INTO usuarios (id, nombre, email, departamento, salario, fecha_ingreso) VALUES (1, 'Ana García', 'ana@empresa.com', 'IT', 75000.5, '2024-01-15');",
  "createTable": "CREATE TABLE usuarios (\n  ID NUMBER(10),\n  NOMBRE VARCHAR2(4000),\n  EMAIL VARCHAR2(4000),\n  DEPARTAMENTO VARCHAR2(4000),\n  SALARIO NUMBER(10,2),\n  FECHA_INGRESO VARCHAR2(4000)\n);",
  "generatedAt": "2025-09-17T..."
}
```

### Ejemplo 2: Array con múltiples tablas
```json
[
  {
    "tableName": "empleados",
    "id": 1,
    "nombre": "Carlos López",
    "puesto": "Developer"
  },
  {
    "tableName": "empleados", 
    "id": 2,
    "nombre": "María Silva",
    "puesto": "Designer"
  },
  {
    "tableName": "departamentos",
    "id": 1,
    "nombre": "Tecnología",
    "presupuesto": 100000
  }
]
```

## 🛠️ Tipos de Datos Soportados

| Tipo JSON | Tipo Oracle | Ejemplo |
|-----------|-------------|---------|
| `string` | `VARCHAR2(4000)` | `'Juan Pérez'` |
| `number` (entero) | `NUMBER(10)` | `123` |
| `number` (decimal) | `NUMBER(10,2)` | `123.45` |
| `boolean` | `CHAR(1)` | `'Y'` o `'N'` |
| `object/array` | `CLOB` | `'{"key":"value"}'` |
| `null` | `NULL` | `NULL` |

## 🎯 Funcionalidades

### 1. INSERT Individuales
Cada objeto genera un statement INSERT separado.

### 2. CREATE TABLE Automático
Se genera automáticamente basado en los tipos de datos del JSON.

### 3. BATCH INSERT (INSERT ALL)
Para arrays con la misma tabla, se genera un INSERT ALL optimizado:

```sql
INSERT ALL
  INTO empleados (id, nombre, puesto) VALUES (1, 'Carlos López', 'Developer')
  INTO empleados (id, nombre, puesto) VALUES (2, 'María Silva', 'Designer')
SELECT * FROM dual;
```

### 4. Manejo de Errores
Respuestas detalladas con ejemplos de uso correcto.

## 🔧 Estructura del Proyecto

```
deno-simple-proxy/
├── main.ts           # Servidor principal
├── README.md         # Esta documentación
└── main-backup.ts    # Backup de versión anterior
```

## 📝 Logs del Servidor

El servidor muestra información detallada:

```
🚀 Proxy Deno escuchando en http://localhost:8003
📝 Envía POST con JSON para generar SQL de Oracle
💡 Ejemplos:
   • Objeto: { "tableName": "usuarios", "nombre": "Juan" }
   • Array: [{ "tableName": "tabla1", "campo": "valor" }]

✅ JSON recibido: { tableName: "usuarios", nombre: "Juan" }
✅ Procesando objeto individual
📊 SQL generado: INSERT INTO usuarios (nombre) VALUES ('Juan');
```

## 🚨 Solución de Problemas

### Error: "Solo se acepta POST con Content-Type: application/json"
- Verifica que uses método POST
- Asegúrate de incluir header `Content-Type: application/json`

### Error: "Unexpected end of JSON input"
- Verifica que el JSON esté bien formado
- En Postman: Body → Raw → JSON (no Text)

### Error de conexión
- Verifica que el servidor esté corriendo: `deno run --allow-net main.ts`
- El servidor debe mostrar: "🚀 Proxy Deno escuchando en http://localhost:8003"

## 🎉 ¡Listo para usar!

Tu proxy está configurado y listo para convertir cualquier JSON a SQL de Oracle. Solo envía tus datos y recibe SQL limpio y optimizado para tu base de datos.
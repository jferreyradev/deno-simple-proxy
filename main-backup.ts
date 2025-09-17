/**
 * 🚀 Deno Proxy con Generación de SQL para Oracle
 * 
 * Servidor proxy que convierte JSON a statements INSERT de Oracle
 * Soporta objetos individuales y arrays con múltiples tablas
 * 
 * Uso:
 * 1. Ejecutar: deno run --allow-net main.ts
 * 2. POST a http://localhost:8003 con JSON
 * 3. Recibir SQL de Oracle listo para usar
 */

import { serve } from "https://deno.land/std/http/server.ts";

/**
 * Convierte un objeto JSON a statement INSERT de Oracle
 * @param data - Objeto JSON con los datos
 * @param tableName - Nombre de la tabla (por defecto: "DATA_TABLE")
 * @returns Statement INSERT de Oracle
 */
function jsonToOracleInsert(data: Record<string, unknown>, tableName: string = "DATA_TABLE"): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error("Los datos deben ser un objeto JSON válido");
  }

  // Filtrar el campo tableName si existe (usado para arrays con múltiples tablas)
  const filteredData = { ...data };
  delete filteredData.tableName;

  const keys = Object.keys(filteredData);
  const values = Object.values(filteredData);
  const columns = keys.join(', ');

  // Formatear valores según el tipo de dato para Oracle
  const formattedValues = values.map(value => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? "'Y'" : "'N'";
    if (value instanceof Date) return `TO_DATE('${value.toISOString().slice(0, 19).replace('T', ' ')}', 'YYYY-MM-DD HH24:MI:SS')`;
    if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return `'${String(value).replace(/'/g, "''")}'`;
  }).join(', ');

  return `INSERT INTO ${tableName} (${columns}) VALUES (${formattedValues});`;
}

/**
 * Procesa arrays de objetos JSON con campo tableName
 * Agrupa por tabla y genera SQL para cada una
 * @param jsonArray - Array de objetos con campo tableName
 * @returns Array con SQL agrupado por tabla
 */
function processJsonArray(jsonArray: Array<Record<string, unknown>>) {
  const tableGroups: Record<string, Array<Record<string, unknown>>> = {};

  // Agrupar objetos por tabla
  for (const item of jsonArray) {
    const tableName = (item.tableName as string) || "DATA_TABLE";
    if (!tableGroups[tableName]) {
      tableGroups[tableName] = [];
    }
    tableGroups[tableName].push(item);
  }

  // Generar SQL para cada tabla
  return Object.entries(tableGroups).map(([tableName, items]) => ({
    tableName,
    recordCount: items.length,
    inserts: items.map(item => jsonToOracleInsert(item, tableName)),
    createTable: generateCreateTable(items[0], tableName),
    batchInsert: generateBatchInsert(items, tableName)
  }));
}

/**
 * Genera statement CREATE TABLE basado en los tipos de datos JSON
 * @param data - Objeto de ejemplo para inferir tipos
 * @param tableName - Nombre de la tabla
 * @returns Statement CREATE TABLE de Oracle
 */
function generateCreateTable(data: Record<string, unknown>, tableName: string = "DATA_TABLE"): string {
  const columns = Object.entries(data)
    .filter(([key]) => key !== 'tableName')
    .map(([key, value]) => {
      let dataType = 'VARCHAR2(4000)'; // Default
      
      if (typeof value === 'number') {
        dataType = Number.isInteger(value) ? 'NUMBER(10)' : 'NUMBER(10,2)';
      } else if (typeof value === 'boolean') {
        dataType = 'CHAR(1)'; // Para Y/N
      } else if (value instanceof Date) {
        dataType = 'DATE';
      } else if (typeof value === 'object') {
        dataType = 'CLOB'; // Para JSON objects
      } else if (typeof value === 'string' && value.length > 100) {
        dataType = 'CLOB';
      }
      
      return `  ${key.toUpperCase()} ${dataType}`;
    })
    .join(',\n');
  
  return `CREATE TABLE ${tableName} (\n${columns}\n);`;
}

/**
 * Genera INSERT ALL (batch insert) para múltiples registros
 * @param items - Array de objetos para la misma tabla
 * @param tableName - Nombre de la tabla
 * @returns Statement INSERT ALL de Oracle
 */
function generateBatchInsert(items: Array<Record<string, unknown>>, tableName: string): string {
  if (items.length === 0) return '';
  
  const firstItem = { ...items[0] };
  delete firstItem.tableName;
  const columns = Object.keys(firstItem).join(', ');
  
  const values = items.map(item => {
    const filteredItem = { ...item };
    delete filteredItem.tableName;
    const vals = Object.values(filteredItem).map(value => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'boolean') return value ? "'Y'" : "'N'";
      return `'${String(value).replace(/'/g, "''")}'`;
    }).join(', ');
    return `  INTO ${tableName} (${columns}) VALUES (${vals})`;
  }).join('\n');

  return `INSERT ALL\n${values}\nSELECT * FROM dual;`;
}

// 🚀 SERVIDOR HTTP
serve(async (req) => {
  // Solo aceptar POST con JSON
  if (req.method !== "POST" || !req.headers.get("content-type")?.includes("application/json")) {
    return new Response(JSON.stringify({ 
      error: "Solo se acepta POST con Content-Type: application/json" 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Leer y parsear JSON
    const inputData = await req.json();
    console.log("✅ JSON recibido:", inputData);

    let result;

    // Determinar si es array o objeto individual
    if (Array.isArray(inputData)) {
      console.log("✅ Procesando array de objetos con tablas específicas");
      const tables = processJsonArray(inputData);
      
      result = {
        success: true,
        inputType: "array",
        tables: tables,
        summary: {
          totalTables: tables.length,
          totalRecords: tables.reduce((sum, table) => sum + table.recordCount, 0),
          generatedAt: new Date().toISOString()
        }
      };

      // Log para debug
      console.log("📊 SQL generado para múltiples tablas:");
      tables.forEach((table) => {
        console.log(`\n=== TABLA: ${table.tableName} ===`);
        table.inserts.forEach((insert, i) => {
          console.log(`INSERT ${i + 1}: ${insert}`);
        });
      });

    } else {
      console.log("✅ Procesando objeto individual");
      const tableName = (inputData.tableName as string) || "DATA_TABLE";
      const insert = jsonToOracleInsert(inputData, tableName);
      
      result = {
        success: true,
        inputType: "object",
        tableName: tableName,
        insert: insert,
        createTable: generateCreateTable(inputData, tableName),
        generatedAt: new Date().toISOString()
      };

      console.log("📊 SQL generado:", insert);
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.log("❌ Error:", error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      help: "Verifica que el JSON esté bien formado",
      example: {
        single: { "tableName": "usuarios", "nombre": "Juan", "edad": 30 },
        array: [
          { "tableName": "empleados", "nombre": "Ana", "cargo": "Developer" },
          { "tableName": "departamentos", "nombre": "IT", "presupuesto": 50000 }
        ]
      }
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}, { port: 8003 });

console.log("🚀 Proxy Deno escuchando en http://localhost:8003");
console.log("📝 Envía POST con JSON para generar SQL de Oracle");
console.log("💡 Ejemplos:");
console.log("   • Objeto: { \"tableName\": \"usuarios\", \"nombre\": \"Juan\" }");
console.log("   • Array: [{ \"tableName\": \"tabla1\", \"campo\": \"valor\" }]");
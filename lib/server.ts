/**
 * 🌐 Servidor HTTP para el proxy Oracle SQL
 */

import { jsonToOracleInsert, generateCreateTable, processJsonArray } from "./oracle.ts";
import type { ApiResponse, ArrayResponse, SingleObjectResponse, ErrorResponse } from "./types.ts";

/**
 * Maneja las peticiones HTTP y procesa JSON para generar SQL
 * @param req - Request HTTP
 * @returns Response con SQL generado o error
 */
export async function handleRequest(req: Request): Promise<Response> {
  // Solo aceptar POST con JSON
  if (req.method !== "POST" || !req.headers.get("content-type")?.includes("application/json")) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: "Solo se acepta POST con Content-Type: application/json",
      help: "Envía una petición POST con header Content-Type: application/json",
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

  try {
    // Leer y parsear JSON
    const inputData = await req.json();
    console.log("✅ JSON recibido:", inputData);

    let result: ApiResponse;

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
      } as ArrayResponse;

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
      } as SingleObjectResponse;

      console.log("📊 SQL generado:", insert);
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.log("❌ Error:", error);
    
    const errorResponse: ErrorResponse = {
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
}

/**
 * Inicia el servidor HTTP
 * @param port - Puerto donde escuchar (por defecto: 8003)
 * @param serve - Función serve de Deno std
 */
export function startServer(port: number = 8003, serve: (handler: (req: Request) => Promise<Response>, options: { port: number }) => void): void {
  serve(handleRequest, { port });

  console.log(`🚀 Proxy Deno escuchando en http://localhost:${port}`);
  console.log("📝 Envía POST con JSON para generar SQL de Oracle");
  console.log("💡 Ejemplos:");
  console.log("   • Objeto: { \"tableName\": \"usuarios\", \"nombre\": \"Juan\" }");
  console.log("   • Array: [{ \"tableName\": \"tabla1\", \"campo\": \"valor\" }]");
}
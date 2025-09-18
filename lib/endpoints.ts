/**
 * 🔌 Endpoints del proxy Oracle SQL
 */

import { jsonToOracleInsert, generateCreateTable, processJsonArray } from "./oracle.ts";
import type { ApiResponse, ArrayResponse, SingleObjectResponse, ErrorResponse } from "./types.ts";

/**
 * 🏠 Endpoint principal - Conversión JSON a Oracle SQL
 * POST /api/oracle/convert
 */
export async function convertToOracleHandler(req: Request): Promise<Response> {
  try {
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

    return Response.json(result);

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

    return Response.json(errorResponse, { status: 400 });
  }
}

/**
 * 🏥 Endpoint de health check
 * GET /api/health
 */
export function healthHandler(): Response {
  const health = {
    status: "healthy",
    service: "Deno Oracle Proxy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(performance.now() / 1000),
    memory: {
      used: Deno.memoryUsage()
    }
  };

  return Response.json(health);
}

/**
 * 📋 Endpoint de información de la API
 * GET /api/info
 */
export function infoHandler(): Response {
  const info = {
    name: "Deno Oracle Proxy",
    version: "1.0.0",
    description: "Convierte JSON a statements INSERT de Oracle",
    author: "GitHub Copilot",
    endpoints: [
      {
        method: "POST",
        path: "/api/oracle/convert",
        description: "Convierte JSON a SQL INSERT de Oracle"
      },
      {
        method: "GET", 
        path: "/api/health",
        description: "Estado de salud del servicio"
      },
      {
        method: "GET",
        path: "/api/info", 
        description: "Información de la API"
      },
      {
        method: "GET",
        path: "/api/examples",
        description: "Ejemplos de uso"
      }
    ],
    features: [
      "Conversión JSON a Oracle SQL",
      "Soporte para arrays con múltiples tablas",
      "Generación automática de CREATE TABLE",
      "BATCH INSERT (INSERT ALL)",
      "Soporte completo CORS",
      "Reenvío a APIs externas"
    ]
  };

  return Response.json(info);
}

/**
 * 📚 Endpoint con ejemplos de uso
 * GET /api/examples
 */
export function examplesHandler(): Response {
  const examples = {
    description: "Ejemplos de JSON para convertir a Oracle SQL",
    examples: {
      singleObject: {
        description: "Objeto individual - genera un INSERT",
        example: {
          tableName: "usuarios",
          id: 1,
          nombre: "Juan Pérez",
          email: "juan@email.com",
          edad: 30,
          activo: true
        },
        usage: "POST /api/oracle/convert"
      },
      multipleObjects: {
        description: "Array con múltiples objetos - genera múltiples INSERT",
        example: [
          {
            tableName: "empleados",
            id: 1,
            nombre: "Ana García",
            puesto: "Developer"
          },
          {
            tableName: "empleados",
            id: 2,
            nombre: "Carlos López", 
            puesto: "Designer"
          }
        ],
        usage: "POST /api/oracle/convert"
      },
      multipleTables: {
        description: "Array con diferentes tablas - agrupa por tabla",
        example: [
          {
            tableName: "empleados",
            nombre: "María Silva",
            cargo: "Manager"
          },
          {
            tableName: "departamentos",
            nombre: "IT",
            presupuesto: 100000
          }
        ],
        usage: "POST /api/oracle/convert"
      }
    },
    curl: {
      description: "Ejemplo con curl",
      command: `curl -X POST http://localhost:8003/api/oracle/convert \\
  -H "Content-Type: application/json" \\
  -d '{"tableName": "productos", "nombre": "Laptop", "precio": 999.99}'`
    }
  };

  return Response.json(examples);
}

/**
 * 🔍 Endpoint para validar JSON
 * POST /api/validate
 */
export async function validateHandler(req: Request): Promise<Response> {
  try {
    const inputData = await req.json();
    
    const validation = {
      valid: true,
      type: Array.isArray(inputData) ? "array" : "object",
      structure: Array.isArray(inputData) ? {
        length: inputData.length,
        tables: [...new Set(inputData.map((item: { tableName?: string }) => item.tableName || "DATA_TABLE"))]
      } : {
        tableName: inputData.tableName || "DATA_TABLE",
        fields: Object.keys(inputData).filter(key => key !== "tableName")
      },
      message: "JSON válido para conversión a Oracle SQL"
    };

    return Response.json(validation);

  } catch (error) {
    const validation = {
      valid: false,
      error: error instanceof Error ? error.message : "JSON inválido",
      message: "El JSON no es válido"
    };

    return Response.json(validation, { status: 400 });
  }
}
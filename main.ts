/**
 * 🚀 Deno Server Proxy con Generación de SQL para Oracle
 * 
 * Servidor proxy que convierte JSON a statements INSERT de Oracle
 * Soporta objetos individuales y arrays con múltiples tablas
 * Opcionalmente reenvía el SQL generado a otra API
 * Incluye soporte completo para CORS y sistema de logging avanzado
 * 
 * Uso:
 * 1. Ejecutar: deno run --allow-net --allow-write main.ts
 * 2. POST a http://localhost:8003 con JSON
 * 3. Recibir SQL de Oracle listo para usar
 * 4. (Opcional) SQL se reenvía automáticamente a API configurada
 * 5. Logs se guardan automáticamente en la carpeta ./logs/
 */

import { startServer, setDestinationAPI, setPayloadTransformer, setEndpointTransformer } from "./lib/server.ts";
import { configureLogger } from "./lib/logger.ts";
import { configureSqlLogger } from "./lib/sql-logger.ts";
import { PERFORMANCE_CONFIG } from "./lib/config.ts";
import type { SingleObjectResponse, ArrayResponse, ProcedureCallResponse } from "./lib/types.ts";

// 📝 Configurar sistema de logging
configureLogger({
  logDir: "./logs",           // Directorio de logs
  fileName: "proxy.log",      // Nombre del archivo
  level: "INFO",              // Nivel: DEBUG, INFO, WARN, ERROR
  maxFileSize: 5 * 1024 * 1024, // 5MB por archivo
  maxBackupFiles: 10,         // Máximo 10 archivos de backup
  includeTimestamp: true,     // Incluir timestamp
  consoleOutput: true,        // También mostrar en consola
});

// 📊 Configurar logging específico para SQL INSERTs
configureSqlLogger({
  logDir: "./logs",           // Mismo directorio que logs generales
  fileName: "sql-inserts.log", // Archivo separado para SQL
  maxFileSize: 50 * 1024 * 1024, // 50MB por archivo (más grande porque contiene SQL)
  maxBackupFiles: 15,         // Más archivos de backup para SQL
});

// 🔒 Configurar CORS (opcional)
// Por defecto permite todos los orígenes (*), pero puedes restringir:

// Ejemplo 1: Solo dominios específicos
// setCorsConfig({
//   origins: ["https://tu-frontend.com", "https://localhost:3000"],
//   credentials: true
// });

// Ejemplo 2: Headers personalizados
// setCorsConfig({
//   headers: ["Content-Type", "Authorization", "X-API-Key"],
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
// });

// 🎯 Configurar API destino con Bearer token
// Descomenta y modifica la siguiente línea para reenviar el SQL a otra API:

setDestinationAPI(
  "http://10.6.46.114:8083/exec",
  "POST",
  {
    "Authorization": "Bearer demo",
    "Content-Type": "application/json",
    "X-Source": "deno-oracle-proxy"
  }
);

// 🎯 Configurar transformadores por endpoint específico
// Cada endpoint puede tener su propio formato de payload
// 
// ⚠️  IMPORTANTE: Los transformadores generan SOLO INSERT statements
//    Las tablas deben existir previamente en la base de datos
//    Para evitar errores ORA-00942, asegúrate de que las tablas estén creadas

// Ejemplo 1: Para endpoints que terminan en "/exec" - formato simple INSERT
setEndpointTransformer(
  "*/exec",  // Patrón: cualquier URL que termine en /exec
  (sqlData, _originalData) => {
    if (!sqlData.success) return { error: "SQL generation failed" };
    
    // 🎯 Formato específico solicitado: { "query": "INSERT..." } SIN CREATE TABLE
    if (sqlData.inputType === "object") {
      const objectData = sqlData as SingleObjectResponse;
      const cleanQuery = objectData.insert.replace(/;$/, ''); // Eliminar ; al final para Oracle
      return {
        query: cleanQuery
      };
    }
    
    // Para arrays, enviar TODOS LOS INSERTS usando PL/SQL Block SIN CREATE TABLES
    if (sqlData.inputType === "array") {
      const arrayData = sqlData as ArrayResponse;
      const allInserts = arrayData.tables.flatMap(t => t.inserts);
      
      if (allInserts.length === 0) {
        return { error: "No INSERT statements generated" };
      }
      
      // 🎯 ESTRATEGIA PARA TODOS LOS INSERTS: PL/SQL Block simple
      if (allInserts.length === 1) {
        // Si solo hay uno, enviar simple sin punto y coma
        const cleanQuery = allInserts[0].replace(/;$/, '');
        return { query: cleanQuery };
      } else {
        // Múltiples INSERTs: usar bloque PL/SQL
        const plsqlBlock = `BEGIN
${allInserts.map(insert => `  ${insert.replace(/;$/, '')};`).join('\n')}
  COMMIT;
END;`;
        
        return {
          query: plsqlBlock
        };
      }
    }
    
    return { error: "Unsupported data type" };
  },
  {
    method: "POST",
    headers: {
      "X-Source": "deno-proxy",
      "X-Format": "query-only"
    }
  }
);

// 📝 ALTERNATIVAS PARA MÚLTIPLES INSERTS:
// 
// Opción A (ACTUAL): Solo primer INSERT - Más confiable, evita errores Oracle
// Opción B: PL/SQL Block - Envuelve en BEGIN/END para múltiples statements
// Opción C: Array de queries - Envía cada INSERT por separado (requiere cambios en servidor destino)
// 
// Descomenta la opción que prefieras:

// 🎯 OPCIÓN B: Transformer para PL/SQL Block (múltiples INSERTs en una transacción)
// COMENTADO - Descomenta si necesitas ejecutar múltiples INSERTs en un bloque PL/SQL
// 
// setEndpointTransformer(
//   "asterisco/exec-batch",  // Endpoint diferente para operaciones batch (reemplaza asterisco por *)
//   (sqlData, originalData) => {
//     if (!sqlData.success) return { error: "SQL generation failed" };
//     
//     if (sqlData.inputType === "array") {
//       const arrayData = sqlData as ArrayResponse;
//       const allInserts = arrayData.tables.flatMap(t => t.inserts);
//       
//       if (allInserts.length === 0) {
//         return { error: "No INSERT statements generated" };
//       }
//       
//       // Formato PL/SQL para múltiples statements
//       const plsqlBlock = `BEGIN
// ${allInserts.map(insert => `  ${insert};`).join('\n')}
//   COMMIT;
// END;`;
//       
//       return {
//         query: plsqlBlock,
//         type: "plsql-block",
//         statementCount: allInserts.length
//       };
//     }
//     
//     // Para objetos individuales, usar INSERT simple
//     if (sqlData.inputType === "object") {
//       const objectData = sqlData as SingleObjectResponse;
//       return { query: objectData.insert };
//     }
//     
//     return { error: "Unsupported data type" };
//   },
//   {
//     method: "POST",
//     headers: {
//       "Authorization": "Bearer tu-token-batch",
//       "X-Source": "deno-proxy",
//       "X-Format": "plsql-block"
//     }
//   }
// );

// 🎯 OPCIÓN C: Transformer para Array de Queries (requiere servidor que acepte arrays)
// COMENTADO - Descomenta si tu servidor acepta arrays de queries
// 
// setEndpointTransformer(
//   "asterisco/exec-array",  // Endpoint para arrays de queries (reemplaza asterisco por *)
//   (sqlData, originalData) => {
//     if (!sqlData.success) return { error: "SQL generation failed" };
//     
//     if (sqlData.inputType === "array") {
//       const arrayData = sqlData as ArrayResponse;
//       const allInserts = arrayData.tables.flatMap(t => t.inserts);
//       
//       return {
//         queries: allInserts,  // Array de queries separadas
//         executionMode: "sequential",
//         transactional: true
//       };
//     }
//     
//     if (sqlData.inputType === "object") {
//       const objectData = sqlData as SingleObjectResponse;
//       return {
//         queries: [objectData.insert],
//         executionMode: "single"
//       };
//     }
//     
//     return { error: "Unsupported data type" };
//   },
//   {
//     method: "POST",
//     headers: {
//       "Authorization": "Bearer tu-token-array",
//       "X-Source": "deno-proxy",
//       "X-Format": "query-array"
//     }
//   }
// );

// 🎯 Transformer específico para tu endpoint de ejecución
setEndpointTransformer(
  "*10.6.46.114:8081*",  // Patrón específico para tu servidor
  (sqlData, _originalData) => {
    if (!sqlData.success) return { error: "SQL generation failed" };
    
    // Formato exacto solicitado: { "query": "INSERT..." } SIN CREATE TABLE
    if (sqlData.inputType === "object") {
      const objectData = sqlData as SingleObjectResponse;
      const cleanQuery = objectData.insert.replace(/;$/, ''); // Eliminar ; al final para Oracle
      return {
        query: cleanQuery
      };
    }
    
    // Para arrays, enviar TODOS LOS INSERTS usando PL/SQL Block SIN CREATE TABLES
    if (sqlData.inputType === "array") {
      const arrayData = sqlData as ArrayResponse;
      const allInserts = arrayData.tables.flatMap(t => t.inserts);
      
      if (allInserts.length === 0) {
        return { error: "No INSERT statements generated" };
      }
      
      // 🎯 ESTRATEGIA PARA TODOS LOS INSERTS: PL/SQL Block simple
      if (allInserts.length === 1) {
        // Si solo hay uno, enviar simple sin punto y coma
        const cleanQuery = allInserts[0].replace(/;$/, '');
        return { query: cleanQuery };
      } else {
        // Múltiples INSERTs: usar bloque PL/SQL
        const plsqlBlock = `BEGIN
${allInserts.map(insert => `  ${insert.replace(/;$/, '')};`).join('\n')}
  COMMIT;
END;`;
        
        return {
          query: plsqlBlock
        };
      }
    }
    
    return { error: "No SQL generated" };
  },
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer tu-token-especifico-aqui",
      "Content-Type": "application/json",
      "X-Source": "deno-oracle-proxy",
      "X-API-Version": "v1"
    }
  }
);

// 🔧 Transformer específico para procedimientos almacenados
setEndpointTransformer(
  "*/procedimiento",  // Patrón: cualquier URL que termine en /procedimiento
  (sqlData, originalData) => {
    if (!sqlData.success) return { error: "Procedure call generation failed" };
    
    // 🔧 Formato específico para procedimientos: { "name": "...", "isFunction": true, "params": [...] }
    if (sqlData.inputType === "procedure") {
      const procedureData = sqlData as ProcedureCallResponse;
      const originalProcData = originalData as { procedureName: string; parameters?: Record<string, unknown> };
      
      // Convertir parámetros al formato esperado
      const params = [];
      if (originalProcData.parameters) {
        for (const [paramName, paramValue] of Object.entries(originalProcData.parameters)) {
          params.push({
            name: paramName,
            value: paramValue
          });
        }
      }
      
      return {
        name: procedureData.procedureName,
        isFunction: true,
        params: params
      };
    }
    
    // Para múltiples procedimientos, enviar solo el primero (el endpoint destino parece manejar uno a la vez)
    if (sqlData.inputType === "multiple-procedures") {
      const originalArray = originalData as Array<{ procedureName: string; parameters?: Record<string, unknown> }>;
      
      if (originalArray && originalArray.length > 0) {
        const firstProcedure = originalArray[0];
        
        // Convertir parámetros del primer procedimiento
        const params = [];
        if (firstProcedure.parameters) {
          for (const [paramName, paramValue] of Object.entries(firstProcedure.parameters)) {
            params.push({
              name: paramName,
              value: paramValue
            });
          }
        }
        
        return {
          name: firstProcedure.procedureName,
          isFunction: true,
          params: params
        };
      }
    }
    
    return { error: "Unsupported procedure data type" };
  },
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer demo",
      "Content-Type": "application/json",
      "X-Source": "deno-oracle-proxy",
      "X-Format": "procedure-call"
    }
  }
);

// Ejemplo 2: Para APIs de testing local - formato extendido
setEndpointTransformer(
  "localhost:*",  // Patrón: cualquier localhost con cualquier puerto
  (sqlData, originalData) => {
    return {
      environment: "development",
      timestamp: new Date().toISOString(),
      source: "deno-proxy-local",
      payload: {
        originalRequest: originalData,
        generatedSQL: sqlData,
        debug: {
          inputType: Array.isArray(originalData) ? "array" : "object",
          sqlCount: sqlData.success && sqlData.inputType === "object" ? 1 : 
                    sqlData.success && sqlData.inputType === "array" ? sqlData.tables?.reduce((sum: number, t: { recordCount: number }) => sum + t.recordCount, 0) : 0
        }
      }
    };
  },
  {
    method: "POST",
    headers: {
      "X-Environment": "development",
      "X-Debug": "true"
    }
  }
);

// Ejemplo 3: Para APIs específicas por dominio
setEndpointTransformer(
  "*api.empresa.com*",  // Patrón: cualquier subdominio de api.empresa.com
  (sqlData, _originalData) => {
    return {
      companyFormat: true,
      data: {
        sql: sqlData.success && sqlData.inputType === "object" ? 
             [sqlData.insert] : 
             sqlData.success && sqlData.inputType === "array" ? sqlData.tables?.flatMap((t: { inserts: string[] }) => t.inserts) || [] : [],
        metadata: {
          generated: new Date().toISOString(),
          source: "oracle-proxy",
          version: "1.0"
        }
      }
    };
  },
  {
    headers: {
      "Authorization": "Bearer your-token-here",
      "X-Company-Format": "v1"
    }
  }
);

// 📦 Configurar transformación global (opcional)
// Formato simple para cuando no hay transformer específico

setPayloadTransformer((sqlData, _originalData) => {
  if (!sqlData.success) return { error: "SQL generation failed" };
  
  // 🎯 Formato simple por defecto: { "query": "INSERT..." } SIN CREATE TABLE
  if (sqlData.inputType === "object") {
    const objectData = sqlData as SingleObjectResponse;
    return {
      query: objectData.insert
    };
  }
  
  if (sqlData.inputType === "array") {
    const arrayData = sqlData as ArrayResponse;
    const allInserts = arrayData.tables.flatMap(table => table.inserts);
    
    // Si hay múltiples INSERTs, enviar el primero o combinar
    return {
      query: allInserts.length > 0 ? allInserts[0] : "-- No SQL generated"
    };
  }
  
  return sqlData;
});

// Ejemplo 2: Formato complejo con metadatos
// setPayloadTransformer((sqlData, originalData) => {
//   return {
//     timestamp: new Date().toISOString(),
//     source: "deno-simple-proxy",
//     version: "1.0.0",
//     data: {
//       sql: sqlData.inputType === "object" ? [sqlData.insert] : 
//            sqlData.tables.flatMap(table => table.inserts),
//       metadata: {
//         inputType: sqlData.inputType,
//         generatedAt: sqlData.generatedAt,
//         originalPayload: originalData
//       }
//     }
//   };
// });

// Para testing local, puedes usar:
// setDestinationAPI("http://localhost:8004/sql");

// 🚀 Iniciar el servidor
if (import.meta.main) {
  console.log("🔒 CORS habilitado por defecto para todos los orígenes");
  console.log("🌐 El proxy puede ser usado desde cualquier navegador web");
  console.log("📝 Los logs se guardarán en ./logs/proxy.log");
  
  // Mostrar configuración de performance
  console.log("⚡ Configuración de Performance:");
  console.log(`   • Timeout por defecto: ${PERFORMANCE_CONFIG.DEFAULT.timeout}ms`);
  console.log(`   • Timeout para procedimientos: ${PERFORMANCE_CONFIG.SLOW.timeout}ms`);
  console.log(`   • Reintentos: ${PERFORMANCE_CONFIG.DEFAULT.retries}`);
  console.log("   • Optimizaciones automáticas activadas");
  
  startServer(8003);
}
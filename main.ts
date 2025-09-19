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

import { startServer, setDestinationAPI, setPayloadTransformer, setEndpointTransformer, setDestinationRoutes } from "./lib/server.ts";
import { configureLogger } from "./lib/logger.ts";
import { configureSqlLogger } from "./lib/sql-logger.ts";
import type { ApiResponse, SingleObjectResponse, ArrayResponse } from "./lib/types.ts";
import { getConfigForEnvironment } from "./config.ts";

// 🔧 Cargar configuración basada en ambiente
const environment = (Deno.env.get("NODE_ENV") || "development") as "development" | "production" | "testing";
const config = getConfigForEnvironment(environment);

console.log(`🌍 Iniciando en modo: ${environment}`);

// � Configurar sistema de logging usando configuración
configureLogger(config.logger);

// 📊 Configurar logging específico para SQL INSERTs
configureSqlLogger(config.sqlLogger);

// 🎯 Configurar API destino desde configuración (retrocompatibilidad)
if (config.destinationApi) {
  setDestinationAPI(
    config.destinationApi.url,
    config.destinationApi.method,
    config.destinationApi.headers
  );
  console.log(`🎯 API destino configurada: ${config.destinationApi.method} ${config.destinationApi.url}`);
}

// 🎯 Configurar múltiples destinos por endpoint
if (config.destinationRoutes && config.destinationRoutes.length > 0) {
  setDestinationRoutes(config.destinationRoutes);
  console.log(`🎯 Configurados ${config.destinationRoutes.length} destinos específicos por endpoint`);
}

// 🎯 Configurar transformadores de endpoints desde configuración
config.endpointTransformers.forEach(transformerConfig => {
  setEndpointTransformer(
    transformerConfig.pattern,
    (sqlData, originalData) => {
      if (!sqlData.success) return { error: "SQL generation failed" };
      
      // 🎯 Formato estándar para todos los endpoints: { "query": "SQL..." }
      if (sqlData.inputType === "object") {
        const objectData = sqlData as SingleObjectResponse;
        const cleanQuery = objectData.insert.replace(/;$/, '');
        return { query: cleanQuery };
      }
      
      // Para arrays, generar bloque PL/SQL con todos los INSERTs
      if (sqlData.inputType === "array") {
        const arrayData = sqlData as ArrayResponse;
        const allInserts = arrayData.tables.flatMap(t => t.inserts);
        
        if (allInserts.length === 0) {
          return { error: "No INSERT statements generated" };
        }
        
        if (allInserts.length === 1) {
          const cleanQuery = allInserts[0].replace(/;$/, '');
          return { query: cleanQuery };
        } else {
          const plsqlBlock = `BEGIN
${allInserts.map(insert => `  ${insert.replace(/;$/, '')};`).join('\n')}
  COMMIT;
END;`;
          return { query: plsqlBlock };
        }
      }
      
      return { error: "Unsupported data type" };
    },
    {
      method: transformerConfig.method,
      headers: transformerConfig.headers
    }
  );
});

// 📦 Configurar transformación global por defecto
setPayloadTransformer((sqlData, originalData) => {
  if (!sqlData.success) return { error: "SQL generation failed" };
  
  if (sqlData.inputType === "object") {
    const objectData = sqlData as SingleObjectResponse;
    return { query: objectData.insert };
  }
  
  if (sqlData.inputType === "array") {
    const arrayData = sqlData as ArrayResponse;
    const allInserts = arrayData.tables.flatMap(table => table.inserts);
    return {
      query: allInserts.length > 0 ? allInserts[0] : "-- No SQL generated"
    };
  }
  
  return sqlData;
});

// 🚀 Iniciar el servidor con configuración
if (import.meta.main) {
  console.log(`🔒 CORS ${config.corsEnabled ? 'habilitado' : 'deshabilitado'}`);
  console.log("🌐 El proxy puede ser usado desde cualquier navegador web");
  console.log(`📝 Los logs se guardarán en ${config.logger.logDir}/${config.logger.fileName}`);
  startServer(config.port);
}
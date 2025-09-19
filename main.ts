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

// 🔧 Cargar variables de entorno desde .env si existe
try {
  const envContent = await Deno.readTextFile(".env");
  envContent.split("\n").forEach(line => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=");
        Deno.env.set(key, value);
      }
    }
  });
  console.log("📋 Variables de entorno cargadas desde .env");
} catch {
  console.log("📋 No se encontró archivo .env - usando configuración por defecto");
  console.log("💡 Tip: Copia .env.example como .env para personalizar la configuración");
}

import { startServer, setDestinationAPI, setPayloadTransformer, setEndpointTransformer, setDestinationRoutes } from "./lib/server.ts";
import { configureLogger } from "./lib/logger.ts";
import { configureSqlLogger } from "./lib/sql-logger.ts";
import type { ApiResponse, SingleObjectResponse, ArrayResponse } from "./lib/types.ts";
import { getConfigForEnvironment } from "./config.ts";

// 🔧 Cargar configuración basada en ambiente
const environment = (Deno.env.get("DENO_ENV") || "development") as "development" | "production" | "test";
const config = getConfigForEnvironment(environment);

console.log(`🌍 Iniciando en modo: ${environment}`);

// 🔧 Configurar sistema de logging usando configuración
configureLogger(config.logger);

// 📊 Configurar logging específico para SQL INSERTs
configureSqlLogger(config.sqlLogger);

// 🎯 Configurar múltiples destinos por endpoint
if (config.destinationRoutes && config.destinationRoutes.length > 0) {
  setDestinationRoutes(config.destinationRoutes);
  console.log(`🎯 Configurados ${config.destinationRoutes.length} destinos específicos por endpoint`);
}

// 🎯 Configurar transformers por endpoint específico
if (config.endpointTransformers && config.endpointTransformers.length > 0) {
  for (const transformer of config.endpointTransformers) {
    setEndpointTransformer(
      transformer.pattern,
      (sqlData: any, originalData: any) => ({ ...sqlData }),
      { 
        method: transformer.method,
        headers: transformer.headers 
      }
    );
    console.log(`🎯 Transformer configurado para endpoint: ${transformer.pattern}`);
    if (transformer.method) {
      console.log(`   Método: ${transformer.method}`);
    }
    console.log(`   Headers: ${JSON.stringify(transformer.headers, null, 2)}`);
  }
}

// 🔄 Configurar transformer personalizado para datos
setPayloadTransformer((data) => {
  // Transformer que toma los datos originales y los mantiene
  return { originalData: data };
});
console.log("🔄 Transformer de payload personalizado configurado");

// 🔒 Configurar CORS
if (config.corsEnabled) {
  console.log("🔒 CORS habilitado");
  console.log("🌐 El proxy puede ser usado desde cualquier navegador web");
}

// 📝 Información de logging
console.log(`📝 Los logs se guardarán en ${config.logger.logDir}/${config.logger.fileName}`);

/**
 * 🎯 Ejemplo de configuración dinámica de una nueva API
 * Esto se ejecuta solo al inicializar el servidor
 */
async function configureDynamicEndpoints() {
  // Configuración dinámica ejemplar
  // setDestinationAPI("https://api.ejemplo.com", "POST", { "Authorization": "Bearer token" });
}

// ⚡ Ejecutar configuración dinámica
await configureDynamicEndpoints();

/**
 * 🚀 Inicializar servidor si este archivo se ejecuta directamente
 */
if (import.meta.main) {
  try {
    await startServer(config.port);
  } catch (error) {
    console.error("❌ Error iniciando servidor:", error);
    Deno.exit(1);
  }
}

/**
 * 📤 Exportar para uso como módulo
 */
export { startServer, setDestinationAPI, setPayloadTransformer, setEndpointTransformer };
export type { ApiResponse, SingleObjectResponse, ArrayResponse };
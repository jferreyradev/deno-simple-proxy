/**
 * 🌐 Servidor HTTP para el proxy Oracle SQL
 */

import type { ApiResponse, ErrorResponse, ForwardResponse } from "./types.ts";
import { Router } from "./router.ts";
import { 
  convertToOracleHandler,
  procHandler,
  healthHandler, 
  infoHandler, 
  examplesHandler, 
  validateHandler,
  logStatsHandler,
  searchSqlLogsHandler,
  setTransformerHandler,
  setEndpointTransformerHandler,
  listTransformersHandler,
  setBearerTokenHandler,
  getForwardLogsHandler,
  getForwardStatsHandler
} from "./endpoints.ts";
import { logger } from "./logger.ts";

/**
 * 🔒 Configuración CORS
 */
interface CorsConfig {
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
}

let CORS_CONFIG: CorsConfig = {
  origins: ["*"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  headers: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Api-Key",
    "X-Source",
    "X-Client-Version"
  ],
  credentials: false
};

export function setCorsConfig(config: Partial<CorsConfig>): void {
  CORS_CONFIG = { ...CORS_CONFIG, ...config };
  console.log("🔒 CORS configurado:", CORS_CONFIG);
}

let DESTINATION_API_URL: string | null = null;
let DESTINATION_API_METHOD: string = "POST";
let DESTINATION_API_HEADERS: Record<string, string> = {};
let CUSTOM_PAYLOAD_TRANSFORMER: ((sqlData: ApiResponse, originalData: unknown) => unknown) | null = null;

// 🎯 Sistema de transformación por endpoint
interface EndpointTransformer {
  transformer: (sqlData: ApiResponse, originalData: unknown) => unknown;
  method?: string;
  headers?: Record<string, string>;
}

let ENDPOINT_TRANSFORMERS: Map<string, EndpointTransformer> = new Map();

// 🎯 Sistema de destinos múltiples por endpoint
interface EndpointDestination {
  url: string;
  method: string;
  headers: Record<string, string>;
  description?: string;
}

let ENDPOINT_DESTINATIONS: Map<string, EndpointDestination> = new Map();

export function setDestinationAPI(
  url: string, 
  method: string = "POST", 
  headers: Record<string, string> = {}
): void {
  DESTINATION_API_URL = url;
  DESTINATION_API_METHOD = method.toUpperCase();
  DESTINATION_API_HEADERS = headers;
  console.log(`🚀 API destino configurada: ${method} ${url}`);
  if (Object.keys(headers).length > 0) {
    console.log(`📋 Headers personalizados:`, headers);
  }
}

/**
 * 🎯 Configura múltiples destinos por endpoint
 * @param routes - Array de configuraciones de rutas con sus destinos
 */
export function setDestinationRoutes(routes: Array<{
  pattern: string;
  destination: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  description?: string;
}>): void {
  routes.forEach(route => {
    ENDPOINT_DESTINATIONS.set(route.pattern, {
      url: route.destination.url,
      method: route.destination.method.toUpperCase(),
      headers: route.destination.headers,
      description: route.description
    });
    console.log(`🎯 Destino configurado para ${route.pattern}: ${route.destination.method} ${route.destination.url}`);
    if (route.description) {
      console.log(`   📝 ${route.description}`);
    }
  });
}

/**
 * Configura una función personalizada para transformar el payload
 * @param transformer - Función que recibe (sqlData, originalData) y retorna el payload personalizado
 */
export function setPayloadTransformer(
  transformer: (sqlData: ApiResponse, originalData: unknown) => unknown
): void {
  CUSTOM_PAYLOAD_TRANSFORMER = transformer;
  console.log("🔄 Transformer de payload personalizado configurado");
}

/**
 * 🎯 Configura un transformer específico para un endpoint
 * @param endpointPattern - Patron del endpoint (ej: asterisco/exec, localhost:8081/asterisco, api.example.com/sql)
 * @param transformer - Función transformadora específica para este endpoint
 * @param options - Opciones adicionales (metodo HTTP, headers)
 */
export function setEndpointTransformer(
  endpointPattern: string,
  transformer: (sqlData: ApiResponse, originalData: unknown) => unknown,
  options: { method?: string; headers?: Record<string, string> } = {}
): void {
  ENDPOINT_TRANSFORMERS.set(endpointPattern, {
    transformer,
    method: options.method?.toUpperCase(),
    headers: options.headers
  });
  console.log(`🎯 Transformer configurado para endpoint: ${endpointPattern}`);
  if (options.method) console.log(`   Método: ${options.method}`);
  if (options.headers) console.log(`   Headers:`, options.headers);
}

/**
 * 🔍 Busca el transformer apropiado para una URL
 * @param url - URL de destino
 * @returns EndpointTransformer o null si no encuentra
 */
function findEndpointTransformer(url: string): EndpointTransformer | null {
  for (const [pattern, transformer] of ENDPOINT_TRANSFORMERS.entries()) {
    // Convertir patrón a regex simple
    const regexPattern = pattern
      .replace(/\*/g, '.*')  // * = cualquier cosa
      .replace(/\./g, '\\.')  // . literal
      .replace(/\?/g, '\\?'); // ? literal
    
    const regex = new RegExp(regexPattern, 'i');
    
    if (regex.test(url)) {
      console.log(`🎯 Transformer encontrado para ${url} con patrón: ${pattern}`);
      return transformer;
    }
  }
  
  return null;
}

/**
 * 📋 Obtiene la configuración completa para una URL
 * @param url - URL de destino
 * @returns Configuración completa (transformer, método, headers)
 */
function getEndpointConfig(url: string): {
  transformer: ((sqlData: ApiResponse, originalData: unknown) => unknown) | null;
  method: string;
  headers: Record<string, string>;
} {
  const endpointTransformer = findEndpointTransformer(url);
  
  if (endpointTransformer) {
    return {
      transformer: endpointTransformer.transformer,
      method: endpointTransformer.method || DESTINATION_API_METHOD,
      headers: { ...DESTINATION_API_HEADERS, ...(endpointTransformer.headers || {}) }
    };
  }
  
  // Usar configuración global si no hay transformer específico
  return {
    transformer: CUSTOM_PAYLOAD_TRANSFORMER,
    method: DESTINATION_API_METHOD,
    headers: DESTINATION_API_HEADERS
  };
}

/**
 * 📊 Listar todos los transformers configurados
 */
export function listEndpointTransformers(): Array<{
  pattern: string;
  method?: string;
  hasHeaders: boolean;
  hasTransformer: boolean;
}> {
  return Array.from(ENDPOINT_TRANSFORMERS.entries()).map(([pattern, config]) => ({
    pattern,
    method: config.method,
    hasHeaders: !!config.headers && Object.keys(config.headers).length > 0,
    hasTransformer: !!config.transformer
  }));
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigin = CORS_CONFIG.origins.includes("*") || 
                       (origin && CORS_CONFIG.origins.includes(origin)) 
                       ? (origin || "*") 
                       : "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": CORS_CONFIG.methods.join(", "),
    "Access-Control-Allow-Headers": CORS_CONFIG.headers.join(", "),
    "Access-Control-Allow-Credentials": CORS_CONFIG.credentials.toString(),
    "Access-Control-Max-Age": "86400"
  };
}

function handleOptionsRequest(req: Request): Response {
  const origin = req.headers.get("origin");
  const requestedMethod = req.headers.get("access-control-request-method");
  const requestedHeaders = req.headers.get("access-control-request-headers");
  
  console.log("🔒 Handling CORS preflight request");
  console.log(`   Origin: ${origin}`);
  console.log(`   Requested Method: ${requestedMethod}`);
  console.log(`   Requested Headers: ${requestedHeaders}`);
  
  const corsHeaders = getCorsHeaders(req);
  console.log("📋 CORS headers enviados:", corsHeaders);
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}

const router = new Router();

router.post("/api/oracle/convert", convertToOracleHandler);
router.post("/api/oracle/proc", procHandler);
router.post("/api/validate", validateHandler);

router.get("/api/health", (_req: Request) => Promise.resolve(healthHandler()));
router.get("/api/info", (_req: Request) => Promise.resolve(infoHandler()));
router.get("/api/examples", (_req: Request) => Promise.resolve(examplesHandler()));
router.get("/api/logs/stats", (_req: Request) => Promise.resolve(logStatsHandler()));
router.get("/api/logs/sql/search", searchSqlLogsHandler);
router.get("/api/logs/forwards", getForwardLogsHandler);
router.get("/api/stats/forwards", (_req: Request) => Promise.resolve(getForwardStatsHandler()));
router.post("/api/config/transformer", setTransformerHandler);
router.post("/api/config/endpoint-transformer", setEndpointTransformerHandler);
router.post("/api/config/bearer-token", setBearerTokenHandler);
router.get("/api/config/transformers", (_req: Request) => Promise.resolve(listTransformersHandler()));
router.post("/api/validate", validateHandler);

export async function handleRequest(req: Request): Promise<Response> {
  const startTime = Date.now();
  
  // Log de la petición entrante
  await logger.logRequest(req, startTime);

  if (req.method === "OPTIONS") {
    const response = handleOptionsRequest(req);
    await logger.logResponse(req, response, startTime);
    return response;
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const url = new URL(req.url);
    const route = router.findRoute(req.method, url.pathname);

    if (route) {
      await logger.info(`Ruta encontrada: ${req.method} ${url.pathname}`);
      
      // Para el endpoint de conversión, necesitamos manejar el reenvío
      if (url.pathname === "/api/oracle/convert" && req.method === "POST") {
        try {
          // Leer el body una sola vez
          const requestBody = await req.json();
          
          // Crear una nueva Request con el body para el handler
          const newReq = new Request(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(requestBody)
          });
          
          const response = await route.route.handler(newReq, route.params);
          const responseClone = response.clone();
          const responseData = await responseClone.json();
          
          if (responseData.success) {
            // Log del procesamiento de datos
            await logger.logDataProcessing(
              "JSON to Oracle SQL conversion",
              requestBody,
              responseData,
              Date.now() - startTime
            );

            const forwardResult = await forwardToDestinationAPI(responseData, requestBody, url.pathname);
            
            const finalResponse = {
              ...responseData,
              forwarded: {
                success: forwardResult !== null && !forwardResult.error,
                response: forwardResult,
                destinationUrl: forwardResult?.destinationUrl || DESTINATION_API_URL
              }
            };

            const response2 = new Response(JSON.stringify(finalResponse, null, 2), {
              status: response.status,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              },
            });

            await logger.logResponse(req, response2, startTime);
            return response2;
          }
          
          // Si no es exitoso, devolver la respuesta original con CORS
          await logger.warn("Conversión fallida", responseData);
          const responseHeaders = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            responseHeaders.set(key, value);
          });

          const errorResponse = new Response(response.body, {
            status: response.status,
            headers: responseHeaders,
          });

          await logger.logResponse(req, errorResponse, startTime);
          return errorResponse;
          
        } catch (error) {
          await logger.error("Error procesando endpoint de conversión", { 
            error: error instanceof Error ? error.message : String(error),
            url: req.url,
            method: req.method
          });
          
          const errorResponse: ErrorResponse = {
            success: false,
            error: error instanceof Error ? error.message : "Error procesando petición",
            help: "Verifica que el JSON esté bien formado",
            example: {
              single: { "error": "Error procesando" },
              array: [{ "error": "Error procesando" }]
            }
          };

          const errorResponse500 = new Response(JSON.stringify(errorResponse, null, 2), {
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          });

          await logger.logResponse(req, errorResponse500, startTime);
          return errorResponse500;
        }
      }
      
      // Para otros endpoints, usar el handler normal
      const response = await route.route.handler(req, route.params);

      const responseHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      const finalResponse = new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });

      await logger.logResponse(req, finalResponse, startTime);
      return finalResponse;

    } else {
      await logger.warn(`Endpoint no encontrado: ${req.method} ${url.pathname}`);
      
      const errorResponse: ErrorResponse = {
        success: false,
        error: `Endpoint no encontrado: ${req.method} ${url.pathname}`,
        help: "Consulta /api/info para ver los endpoints disponibles",
        example: { 
          single: { "error": "Endpoint no disponible" },
          array: [{ "error": "Endpoint no disponible" }]
        }
      };

      const notFoundResponse = new Response(JSON.stringify(errorResponse, null, 2), {
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });

      await logger.logResponse(req, notFoundResponse, startTime);
      return notFoundResponse;
    }

  } catch (error) {
    await logger.error("Error interno del servidor", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: req.url,
      method: req.method
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Error interno del servidor",
      help: "Verifica tu petición y inténtalo de nuevo",
      example: {
        single: { "error": "Error interno" },
        array: [{ "error": "Error interno" }]
      }
    };

    const serverErrorResponse = new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });

    await logger.logResponse(req, serverErrorResponse, startTime);
    return serverErrorResponse;
  }
}

async function forwardToDestinationAPI(
  sqlData: ApiResponse, 
  originalData: unknown, 
  endpoint?: string
): Promise<ForwardResponse | null> {
  
  // 🎯 Buscar destino específico para este endpoint
  let destinationConfig: EndpointDestination | null = null;
  let destinationUrl = DESTINATION_API_URL;
  let destinationMethod = DESTINATION_API_METHOD;
  let destinationHeaders = DESTINATION_API_HEADERS;

  if (endpoint) {
    // Buscar configuración específica para este endpoint
    for (const [pattern, config] of ENDPOINT_DESTINATIONS.entries()) {
      if (endpoint === pattern || endpoint.includes(pattern.replace('*', ''))) {
        destinationConfig = config;
        destinationUrl = config.url;
        destinationMethod = config.method;
        destinationHeaders = config.headers;
        await logger.info(`🎯 Usando destino específico para ${endpoint}: ${config.url}`);
        break;
      }
    }
  }

  if (!destinationUrl) {
    await logger.warn("No hay API destino configurada para reenvío");
    return null;
  }

  const forwardStartTime = Date.now();

  try {
    await logger.info(`🚀 Iniciando reenvío a: ${destinationUrl}`);
    
    // 🎯 Obtener configuración específica para este endpoint
    const endpointConfig = getEndpointConfig(destinationUrl);
    
    // 📝 Log de configuración del endpoint
    await logger.info(`📋 Configuración endpoint:`, {
      url: destinationUrl,
      method: endpointConfig.method,
      hasCustomTransformer: !!endpointConfig.transformer,
      headersCount: Object.keys(endpointConfig.headers).length
    });
    
    // Usar transformer específico del endpoint, luego global, sino formato por defecto
    const forwardPayload = endpointConfig.transformer 
      ? endpointConfig.transformer(sqlData, originalData)
      : {
          // 🎯 FORMATO POR DEFECTO - Puedes modificar esto
          timestamp: new Date().toISOString(),
          source: "deno-oracle-proxy",
          version: "1.0.0",
          requestId: crypto.randomUUID(),
          payload: {
            originalData,
            processedSQL: sqlData,
            metadata: {
              generatedAt: new Date().toISOString(),
              dataType: Array.isArray(originalData) ? "array" : "object",
              // Agregar más metadatos según necesites
            }
          }
        };

    // 📝 Log detallado del payload transformado
    await logger.info(`🔄 Payload transformado:`, {
      payloadSize: JSON.stringify(forwardPayload).length,
      payloadType: typeof forwardPayload,
      hasTransformer: endpointConfig.transformer ? "endpoint-specific" : "default",
      payload: forwardPayload
    });

    console.log(`📦 PAYLOAD ENVIADO A ${destinationUrl}:`);
    console.log(JSON.stringify(forwardPayload, null, 2));

    // 📝 Log de headers que se envían
    const requestHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Deno-Oracle-Proxy/1.0",
      ...destinationHeaders,
      ...endpointConfig.headers
    };
    
    await logger.info(`📤 Enviando petición:`, {
      url: destinationUrl,
      method: destinationMethod,
      headers: requestHeaders,
      bodySize: JSON.stringify(forwardPayload).length
    });

    const response = await fetch(destinationUrl, {
      method: destinationMethod,
      headers: requestHeaders,
      body: JSON.stringify(forwardPayload)
    });

    const responseData = await response.json();
    const processingTime = Date.now() - forwardStartTime;
    
    // 📝 Log detallado de la respuesta
    await logger.info(`📥 Respuesta recibida:`, {
      url: destinationUrl,
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      processingTime: `${processingTime}ms`,
      responseSize: JSON.stringify(responseData).length,
      responseData: responseData
    });

    console.log(`📥 RESPUESTA DE ${destinationUrl} (${response.status}):`);
    console.log(`⏱️  Tiempo de procesamiento: ${processingTime}ms`);
    console.log(JSON.stringify(responseData, null, 2));
    
    const result: ForwardResponse = {
      success: response.ok,
      status: response.status,
      data: responseData,
      url: destinationUrl,
      destinationUrl: destinationUrl
    };

    // Logear el reenvío completo
    await logger.logApiForward(
      destinationUrl,
      destinationMethod,
      forwardPayload as Record<string, unknown>,
      { status: response.status, data: responseData },
      processingTime
    );

    if (response.ok) {
      await logger.info(`✅ Reenvío exitoso`, {
        url: destinationUrl,
        status: response.status,
        processingTime: `${processingTime}ms`,
        success: true
      });
      console.log(`✅ Reenvío exitoso a ${destinationUrl} - ${response.status} (${processingTime}ms)`);
    } else {
      await logger.error(`❌ Error en reenvío`, {
        url: destinationUrl,
        status: response.status,
        statusText: response.statusText,
        processingTime: `${processingTime}ms`,
        responseData,
        success: false
      });
      console.log(`❌ Error en reenvío a ${destinationUrl} - ${response.status}: ${response.statusText}`);
    }

    return result;

  } catch (error) {
    const errorTime = Date.now() - forwardStartTime;
    await logger.error(`🚨 Excepción en reenvío`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: destinationUrl,
      duration: `${errorTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🚨 EXCEPCIÓN EN REENVÍO A ${destinationUrl}:`);
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`⏱️  Duración hasta fallo: ${errorTime}ms`);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido en reenvío",
      url: destinationUrl,
      destinationUrl: destinationUrl
    };
  }
}

export function startServer(port: number = 8003): void {
  // Log de inicio del servidor
  logger.info(`Proxy Deno iniciando en puerto ${port}`, {
    port,
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/health",
      "GET /api/info", 
      "GET /api/examples",
      "POST /api/oracle/convert",
      "POST /api/oracle/proc",
      "POST /api/validate"
    ]
  });

  console.log(`🚀 Proxy Deno escuchando en http://localhost:${port}`);
  console.log("📝 Endpoints disponibles:");
  console.log("   • GET /api/health - Estado del servidor");
  console.log("   • GET /api/info - Información de la API");
  console.log("   • GET /api/examples - Ejemplos de uso");
  console.log("   • POST /api/oracle/convert - Conversión JSON a Oracle SQL");
  console.log("   • 🔧 POST /api/oracle/proc - Procesamiento de datos");
  console.log("   • POST /api/validate - Validar JSON");

  // Usar Deno.serve nativo en lugar de importar
  Deno.serve({ port }, handleRequest);
}
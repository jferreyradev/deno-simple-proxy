/**
 * 🌐 Servidor HTTP para el proxy Oracle SQL
 */

import { jsonToOracleInsert, generateCreateTable, processJsonArray } from "./oracle.ts";
import type { ApiResponse, ArrayResponse, SingleObjectResponse, ErrorResponse, ForwardResponse, ForwardResult } from "./types.ts";
import { Router } from "./router.ts";
import { 
  convertToOracleHandler, 
  healthHandler, 
  infoHandler, 
  examplesHandler, 
  validateHandler 
} from "./endpoints.ts";

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
  methods: ["GET", "POST", "OPTIONS"],
  headers: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false
};

export function setCorsConfig(config: Partial<CorsConfig>): void {
  CORS_CONFIG = { ...CORS_CONFIG, ...config };
  console.log("🔒 CORS configurado:", CORS_CONFIG);
}

let DESTINATION_API_URL: string | null = null;

export function setDestinationAPI(url: string): void {
  DESTINATION_API_URL = url;
  console.log(`🚀 API destino configurada: ${url}`);
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
  console.log("🔒 Handling CORS preflight request");
  
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(req)
  });
}

const router = new Router();

router.post("/api/oracle/convert", convertToOracleHandler);
router.get("/api/health", (req: Request) => Promise.resolve(healthHandler()));
router.get("/api/info", (req: Request) => Promise.resolve(infoHandler()));
router.get("/api/examples", (req: Request) => Promise.resolve(examplesHandler()));
router.post("/api/validate", validateHandler);

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const url = new URL(req.url);
    const route = router.findRoute(req.method, url.pathname);

    if (route) {
      console.log(`✅ Ruta encontrada: ${req.method} ${url.pathname}`);
      
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
            const forwardResult = await forwardToDestinationAPI(responseData, requestBody);
            
            const finalResponse = {
              ...responseData,
              forwarded: {
                success: forwardResult !== null && !forwardResult.error,
                response: forwardResult,
                destinationUrl: DESTINATION_API_URL
              }
            };

            return new Response(JSON.stringify(finalResponse, null, 2), {
              status: response.status,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              },
            });
          }
          
          // Si no es exitoso, devolver la respuesta original con CORS
          const responseHeaders = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            responseHeaders.set(key, value);
          });

          return new Response(response.body, {
            status: response.status,
            headers: responseHeaders,
          });
          
        } catch (error) {
          console.log("❌ Error procesando endpoint de conversión:", error);
          
          const errorResponse: ErrorResponse = {
            success: false,
            error: error instanceof Error ? error.message : "Error procesando petición",
            help: "Verifica que el JSON esté bien formado",
            example: {
              single: { "error": "Error procesando" },
              array: [{ "error": "Error procesando" }]
            }
          };

          return new Response(JSON.stringify(errorResponse, null, 2), {
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          });
        }
      }
      
      // Para otros endpoints, usar el handler normal
      const response = await route.route.handler(req, route.params);

      const responseHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });

    } else {
      const errorResponse: ErrorResponse = {
        success: false,
        error: `Endpoint no encontrado: ${req.method} ${url.pathname}`,
        help: "Consulta /api/info para ver los endpoints disponibles",
        example: { 
          single: { "error": "Endpoint no disponible" },
          array: [{ "error": "Endpoint no disponible" }]
        }
      };

      return new Response(JSON.stringify(errorResponse, null, 2), {
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });
    }

  } catch (error) {
    console.log("❌ Error:", error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Error interno del servidor",
      help: "Verifica tu petición y inténtalo de nuevo",
      example: {
        single: { "error": "Error interno" },
        array: [{ "error": "Error interno" }]
      }
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  }
}

async function forwardToDestinationAPI(sqlData: ApiResponse, originalData: unknown): Promise<ForwardResponse | null> {
  if (!DESTINATION_API_URL) {
    console.log("⚠️  No hay API destino configurada para reenvío");
    return null;
  }

  try {
    console.log(`🚀 Reenviando a: ${DESTINATION_API_URL}`);
    
    const forwardPayload = {
      timestamp: new Date().toISOString(),
      source: "deno-oracle-proxy",
      originalData,
      generatedSQL: sqlData
    };

    const response = await fetch(DESTINATION_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Deno-Oracle-Proxy/1.0"
      },
      body: JSON.stringify(forwardPayload)
    });

    const responseData = await response.json();
    
    const result: ForwardResponse = {
      success: response.ok,
      status: response.status,
      data: responseData,
      url: DESTINATION_API_URL
    };

    if (response.ok) {
      console.log("✅ Reenvío exitoso:", result);
    } else {
      console.log("❌ Error en reenvío:", result);
    }

    return result;

  } catch (error) {
    console.log("❌ Error en reenvío:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido en reenvío",
      url: DESTINATION_API_URL
    };
  }
}

export function startServer(port: number = 8003): void {
  console.log(`🚀 Proxy Deno escuchando en http://localhost:${port}`);
  console.log("📝 Endpoints disponibles:");
  console.log("   • GET /api/health - Estado del servidor");
  console.log("   • GET /api/info - Información de la API");
  console.log("   • GET /api/examples - Ejemplos de uso");
  console.log("   • POST /api/oracle/convert - Conversión JSON a Oracle SQL");
  console.log("   • POST /api/validate - Validar JSON");

  // Usar Deno.serve nativo en lugar de importar
  Deno.serve({ port }, handleRequest);
}
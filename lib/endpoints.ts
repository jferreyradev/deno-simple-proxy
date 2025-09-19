/**
 * 🔌 Endpoints del proxy Oracle SQL - Versión simplificada
 */

import { jsonToOracleInsert, processJsonArray, generateProcedureCall, generateMultipleProcedureCalls } from "./oracle.ts";
import type { ApiResponse, ArrayResponse, SingleObjectResponse, ErrorResponse, ProcedureCallResponse, MultipleProceduresResponse } from "./types.ts";
import { logger } from "./logger.ts";
import { sqlLogger } from "./sql-logger.ts";
import { withTimeout, withRetry, measureTime, getConfigForEndpoint } from "./config.ts";

/**
 * 🏠 Endpoint principal - Conversión JSON a Oracle SQL
 * POST /api/oracle/convert
 */
export async function convertToOracleHandler(req: Request): Promise<Response> {
  const startTime = Date.now();
  let sessionId: string | undefined;

  try {
    const inputData = await req.json();
    const dataSize = JSON.stringify(inputData).length;
    console.log("✅ JSON recibido:", inputData);

    let result: ApiResponse;

    // Determinar si es array o objeto individual
    if (Array.isArray(inputData)) {
      console.log("✅ Procesando array de objetos con tablas específicas");
      const tables = processJsonArray(inputData);
      
      // Preparar datos para el logger SQL
      const sqlResults = tables.map(table => ({
        tableName: table.tableName,
        inserts: table.inserts
      }));

      // Registrar en el log SQL
      const processingTime = Date.now() - startTime;
      sessionId = await sqlLogger.logArrayInserts(req, sqlResults, {
        processingTime,
        dataSize
      });
      
      result = {
        success: true,
        inputType: "array",
        tables: tables,
        summary: {
          totalTables: tables.length,
          totalRecords: tables.reduce((sum, table) => sum + table.recordCount, 0),
          generatedAt: new Date().toISOString(),
          sessionId
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
      
      // Registrar en el log SQL
      const processingTime = Date.now() - startTime;
      sessionId = await sqlLogger.logSingleInsert(req, tableName, insert, {
        processingTime,
        dataSize
      });
      
      result = {
        success: true,
        inputType: "object",
        tableName: tableName,
        insert: insert,
        generatedAt: new Date().toISOString(),
        sessionId
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
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: "available", // Deno doesn't have process.uptime()
    service: "Deno Oracle Proxy",
    version: "1.0.0"
  };

  return Response.json(health);
}

/**
 * ℹ️ Endpoint de información del servicio
 * GET /api/info
 */
export function infoHandler(): Response {
  const info = {
    name: "Deno Oracle Proxy",
    version: "1.0.0",
    description: "Convierte JSON a statements INSERT de Oracle con logging avanzado y transformaciones por endpoint",
    author: "GitHub Copilot",
    features: [
      "Conversión JSON a Oracle SQL",
      "Soporte para objetos individuales y arrays",
      "Reenvío a APIs externas",
      "Transformaciones personalizadas por endpoint",
      "Logging avanzado (general + SQL)",
      "Configuración dinámica via API"
    ],
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
        description: "Información del servicio"
      },
      {
        method: "GET",
        path: "/api/examples",
        description: "Ejemplos de uso"
      },
      {
        method: "POST",
        path: "/api/validate",
        description: "Validar JSON sin convertir"
      }
    ],
    timestamp: new Date().toISOString()
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
    singleObject: {
      description: "Objeto individual - genera un INSERT",
      example: {
        tableName: "usuarios",
        id: 1,
        nombre: "Juan Pérez",
        email: "juan@example.com",
        edad: 30,
        activo: true
      },
      expectedSQL: "INSERT INTO usuarios (tableName, id, nombre, email, edad, activo) VALUES ('usuarios', 1, 'Juan Pérez', 'juan@example.com', 30, 1)"
    },
    arrayOfObjects: {
      description: "Array de objetos - cada objeto especifica su tabla",
      example: [
        {
          tableName: "empleados",
          id: 1,
          nombre: "Ana García",
          departamento: "IT"
        },
        {
          tableName: "departamentos", 
          id: 1,
          nombre: "IT",
          presupuesto: 50000
        }
      ],
      expectedResult: "Múltiples INSERTs agrupados por tabla"
    }
  };

  return Response.json(examples);
}

/**
 * 🔧 GET /api/oracle/procedure - Ejemplos de procedimientos
 */
export function procedureExamplesHandler(): Response {
  const examples = {
    description: "Ejemplos para ejecutar procedimientos almacenados Oracle",
    singleProcedure: {
      description: "Procedimiento individual con parámetros",
      example: {
        procedureName: "ganancias.ActualizarEmpleado",
        parameters: {
          p_id: 9999,
          p_nombre: "MARIA CONSTANZA",
          p_apellido: "CAINZO",
          p_activo: true,
          p_fecha: "19-09-2025"
        }
      },
      expectedPLSQL: "BEGIN\n  GANANCIAS.ACTUALIZAREMPLEADO(p_id => 9999, p_nombre => 'MARIA CONSTANZA', p_apellido => 'CAINZO', p_activo => 'Y', p_fecha => TO_DATE('19-09-2025', 'DD-MM-YYYY'));\nEND;"
    },
    packageProcedure: {
      description: "Procedimiento en paquete (esquema.paquete.procedimiento)",
      example: {
        procedureName: "workflow.controles.CARGARESUMENLIQ",
        parameters: {
          vPERIODO: "01-09-2025",
          vIDTIPOLIQ: 1,
          vIDGRUPO: 0,
          vGRUPOREP: 9
        }
      },
      expectedPLSQL: "BEGIN\n  WORKFLOW.CONTROLES.CARGARESUMENLIQ(vPERIODO => TO_DATE('01-09-2025', 'DD-MM-YYYY'), vIDTIPOLIQ => 1, vIDGRUPO => 0, vGRUPOREP => 9);\nEND;"
    },
    multipleProcedures: {
      description: "Múltiples procedimientos en una transacción",
      example: [
        {
          procedureName: "ganancias.InsertarEmpleado",
          parameters: {
            p_nombre: "Juan Perez",
            p_email: "juan@empresa.com"
          }
        },
        {
          procedureName: "auditoria.RegistrarAcceso",
          parameters: {
            p_usuario: "admin",
            p_accion: "INSERT"
          }
        }
      ],
      expectedPLSQL: "BEGIN\n  GANANCIAS.INSERTAREMPLEADO(p_nombre => 'Juan Perez', p_email => 'juan@empresa.com');\n  AUDITORIA.REGISTRARACCESO(p_usuario => 'admin', p_accion => 'INSERT');\n  COMMIT;\nEND;"
    },
    parameterTypes: {
      description: "Tipos de parámetros soportados",
      examples: {
        string: "p_nombre => 'Juan'",
        number: "p_id => 123",
        boolean: "p_activo => 'Y' (true) o 'N' (false)",
        date: "p_fecha => TO_DATE('25-08-2025', 'DD-MM-YYYY')",
        null: "p_opcional => NULL"
      }
    },
    usage: {
      endpoint: "POST /api/oracle/procedure",
      contentType: "application/json",
      note: "Los procedimientos se envían automáticamente a URLs que terminen en '/procedimiento'"
    }
  };

  return Response.json(examples);
}

/**
 * ✅ Endpoint para validar JSON
 * POST /api/validate
 */
export async function validateHandler(req: Request): Promise<Response> {
  try {
    const data = await req.json();
    
    const validation = {
      success: true,
      valid: true,
      message: "JSON válido",
      inputType: Array.isArray(data) ? "array" : "object",
      structure: data,
      timestamp: new Date().toISOString()
    };

    return Response.json(validation);

  } catch (error) {
    const validation = {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : "JSON inválido",
      message: "El JSON proporcionado no es válido",
      timestamp: new Date().toISOString()
    };

    return Response.json(validation, { status: 400 });
  }
}

/**
 * 📊 Endpoint para estadísticas de logs
 * GET /api/logs/stats
 */
export async function logStatsHandler(): Promise<Response> {
  try {
    const generalStats = await logger.getLogStats();
    const sqlStats = await sqlLogger.getStats();
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      logStats: {
        general: generalStats,
        sql: sqlStats
      },
      message: "Estadísticas de logging general y SQL"
    };

    return Response.json(response);
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Error obteniendo estadísticas",
      message: "No se pudieron obtener las estadísticas de logs"
    };

    return Response.json(errorResponse, { status: 500 });
  }
}

/**
 * 🔍 Endpoint para buscar logs SQL
 * GET /api/logs/sql/search?sessionId=abc&tableName=users&maxResults=10
 */
export async function searchSqlLogsHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId') || undefined;
    const tableName = url.searchParams.get('tableName') || undefined;
    const maxResults = parseInt(url.searchParams.get('maxResults') || '50');
    
    const results = await sqlLogger.searchLogs({
      sessionId,
      tableName,
      maxResults
    });
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      searchCriteria: { sessionId, tableName, maxResults },
      resultsCount: results.length,
      results: results,
      message: `Encontrados ${results.length} registros en los logs SQL`
    };

    return Response.json(response);
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Error buscando logs",
      message: "No se pudieron buscar los logs SQL"
    };

    return Response.json(errorResponse, { status: 500 });
  }
}

/**
 * 🔧 Endpoint para configurar transformer dinámicamente
 * POST /api/config/transformer
 */
export async function setTransformerHandler(req: Request): Promise<Response> {
  try {
    const config = await req.json();
    
    if (!config.transformerCode) {
      return Response.json({
        success: false,
        error: "Se requiere 'transformerCode' en el payload",
        example: {
          transformerCode: "(sqlData, originalData) => ({ sql: sqlData.insert, data: originalData })"
        }
      }, { status: 400 });
    }

    try {
      // Validación básica de seguridad para el código del transformer
      if (config.transformerCode.includes('require') || 
          config.transformerCode.includes('import') ||
          config.transformerCode.includes('process') ||
          config.transformerCode.includes('__dirname') ||
          config.transformerCode.includes('eval') ||
          config.transformerCode.includes('Function(')) {
        return Response.json({
          success: false,
          error: "Código de transformer contiene funciones no permitidas por seguridad"
        }, { status: 400 });
      }

      const transformerFn = eval(`(${config.transformerCode})`);
      
      // Verificar que sea una función
      if (typeof transformerFn !== 'function') {
        return Response.json({
          success: false,
          error: "El código debe exportar una función"
        }, { status: 400 });
      }
      
      const { setPayloadTransformer } = await import("./server.ts");
      setPayloadTransformer(transformerFn);
      
      return Response.json({
        success: true,
        message: "Transformer configurado exitosamente",
        transformerCode: config.transformerCode,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return Response.json({
        success: false,
        error: "Error evaluando transformer: " + (error instanceof Error ? error.message : String(error)),
        help: "Verifica la sintaxis del transformer"
      }, { status: 400 });
    }
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Error procesando petición"
    }, { status: 500 });
  }
}

/**
 * 🎯 Endpoint para configurar transformer por endpoint específico
 * POST /api/config/endpoint-transformer
 */
export async function setEndpointTransformerHandler(req: Request): Promise<Response> {
  try {
    const config = await req.json();
    
    if (!config.endpointPattern || !config.transformerCode) {
      return Response.json({
        success: false,
        error: "Se requiere 'endpointPattern' y 'transformerCode' en el payload",
        example: {
          endpointPattern: "*/exec",
          transformerCode: "(sqlData, originalData) => ({ sql: sqlData.insert })",
          method: "POST",
          headers: { "Authorization": "Bearer token" }
        }
      }, { status: 400 });
    }

    try {
      // Validación básica de seguridad para el código del transformer
      if (config.transformerCode.includes('require') || 
          config.transformerCode.includes('import') ||
          config.transformerCode.includes('process') ||
          config.transformerCode.includes('__dirname') ||
          config.transformerCode.includes('eval') ||
          config.transformerCode.includes('Function(')) {
        return Response.json({
          success: false,
          error: "Código de transformer contiene funciones no permitidas por seguridad"
        }, { status: 400 });
      }

      const transformerFn = eval(`(${config.transformerCode})`);
      
      // Verificar que sea una función
      if (typeof transformerFn !== 'function') {
        return Response.json({
          success: false,
          error: "El código debe exportar una función"
        }, { status: 400 });
      }
      
      const { setEndpointTransformer } = await import("./server.ts");
      setEndpointTransformer(
        config.endpointPattern,
        transformerFn,
        {
          method: config.method,
          headers: config.headers
        }
      );
      
      return Response.json({
        success: true,
        message: `Transformer configurado para endpoint: ${config.endpointPattern}`,
        endpointPattern: config.endpointPattern,
        method: config.method || "POST",
        hasHeaders: !!config.headers,
        transformerCode: config.transformerCode,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return Response.json({
        success: false,
        error: "Error evaluando transformer: " + (error instanceof Error ? error.message : String(error)),
        help: "Verifica la sintaxis del transformer"
      }, { status: 400 });
    }
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Error procesando petición"
    }, { status: 500 });
  }
}

/**
 * 📋 Endpoint para listar transformers configurados
 * GET /api/config/transformers
 */
export async function listTransformersHandler(): Promise<Response> {
  try {
    const { listEndpointTransformers } = await import("./server.ts");
    const transformers = listEndpointTransformers();
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalTransformers: transformers.length,
      transformers: transformers,
      message: `${transformers.length} transformers configurados`
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Error obteniendo transformers"
    }, { status: 500 });
  }
}

/**
 * 🔑 Endpoint para configurar Bearer token dinámicamente
 * POST /api/config/bearer-token
 */
export async function setBearerTokenHandler(req: Request): Promise<Response> {
  try {
    const config = await req.json();
    
    if (!config.token) {
      return Response.json({
        success: false,
        error: "Se requiere 'token' en el payload",
        example: {
          token: "tu-bearer-token-aqui",
          endpointPattern: "*10.6.46.114:8081*"
        }
      }, { status: 400 });
    }

    // Importar funciones del servidor
    const { setDestinationAPI, setEndpointTransformer } = await import("./server.ts");
    
    if (config.endpointPattern) {
      // Configurar token para endpoint específico
      setEndpointTransformer(
        config.endpointPattern,
        (sqlData: ApiResponse, _originalData: unknown) => {
          if (!sqlData.success) return { error: "SQL generation failed" };
          
          if (sqlData.inputType === "object") {
            return { query: sqlData.insert };
          }
          
          if (sqlData.inputType === "array") {
            const allInserts = sqlData.tables.flatMap((t: { inserts: string[] }) => t.inserts);
            return { query: allInserts.length > 0 ? allInserts[0] : "" };
          }
          
          return sqlData;
        },
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.token}`,
            "Content-Type": "application/json",
            "X-Source": "deno-oracle-proxy"
          }
        }
      );
      
      return Response.json({
        success: true,
        message: `Bearer token configurado para endpoint: ${config.endpointPattern}`,
        endpointPattern: config.endpointPattern,
        tokenLength: config.token.length,
        timestamp: new Date().toISOString()
      });
    } else {
      // Configurar token global
      setDestinationAPI(
        config.url || "http://10.6.46.114:8081/exec",
        "POST",
        {
          "Authorization": `Bearer ${config.token}`,
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy"
        }
      );
      
      return Response.json({
        success: true,
        message: "Bearer token configurado globalmente",
        url: config.url || "http://10.6.46.114:8081/exec",
        tokenLength: config.token.length,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Error configurando Bearer token"
    }, { status: 500 });
  }
}

/**
 * 📊 Endpoint para ver logs de reenvío a API
 * GET /api/logs/forwards?maxResults=20&status=success
 */
export async function getForwardLogsHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const maxResults = parseInt(url.searchParams.get('maxResults') || '20');
    const status = url.searchParams.get('status'); // 'success', 'error', 'all'
    
    // Obtener logs de reenvío desde el logger principal
    const allLogs = await logger.getRecentLogs(maxResults * 2); // Traer más para filtrar
    
    // Filtrar logs relacionados con reenvío
    const forwardLogs = allLogs.filter(log => {
      const message = log.message?.toLowerCase() || '';
      const isForwardLog = message.includes('reenvío') || 
                          message.includes('enviando petición') || 
                          message.includes('respuesta recibida') ||
                          message.includes('payload transformado');
                          
      if (!isForwardLog) return false;
      
      if (status === 'success') {
        return message.includes('exitoso') || message.includes('✅');
      } else if (status === 'error') {
        return message.includes('error') || message.includes('❌') || message.includes('🚨');
      }
      
      return true; // 'all' o sin filtro
    }).slice(0, maxResults);
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      filters: { maxResults, status: status || 'all' },
      totalLogs: forwardLogs.length,
      logs: forwardLogs,
      message: `${forwardLogs.length} logs de reenvío encontrados`
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Error obteniendo logs de reenvío"
    }, { status: 500 });
  }
}

/**
 * 📈 Endpoint para estadísticas de reenvío
 * GET /api/stats/forwards
 */
export async function getForwardStatsHandler(): Promise<Response> {
  try {
    // Obtener logs recientes para calcular estadísticas
    const recentLogs = await logger.getRecentLogs(1000);
    
    const forwardLogs = recentLogs.filter(log => {
      const message = log.message?.toLowerCase() || '';
      return message.includes('reenvío') || message.includes('enviando petición');
    });
    
    const successLogs = forwardLogs.filter(log => 
      log.message?.includes('exitoso') || log.message?.includes('✅')
    );
    
    const errorLogs = forwardLogs.filter(log => 
      log.message?.includes('error') || log.message?.includes('❌') || log.message?.includes('🚨')
    );
    
    // Calcular estadísticas básicas
    const totalRequests = forwardLogs.length;
    const successRate = totalRequests > 0 ? (successLogs.length / totalRequests * 100).toFixed(2) : '0';
    
    // Agrupar por hora para mostrar actividad
    const hourlyActivity = forwardLogs.reduce((acc, log) => {
      const hour = log.timestamp ? new Date(log.timestamp).getHours() : new Date().getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeRange: "Últimas 1000 entradas de log",
      statistics: {
        totalForwardRequests: totalRequests,
        successfulRequests: successLogs.length,
        failedRequests: errorLogs.length,
        successRate: `${successRate}%`,
        hourlyActivity: hourlyActivity
      },
      recentActivity: {
        lastHour: forwardLogs.filter(log => {
          const logTime = log.timestamp ? new Date(log.timestamp) : new Date();
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return logTime > oneHourAgo;
        }).length,
        last24Hours: forwardLogs.filter(log => {
          const logTime = log.timestamp ? new Date(log.timestamp) : new Date();
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return logTime > oneDayAgo;
        }).length
      },
      message: "Estadísticas de reenvío calculadas exitosamente"
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Error calculando estadísticas de reenvío"
    }, { status: 500 });
  }
}

/**
 * 🔧 Endpoint para ejecutar procedimientos almacenados Oracle - OPTIMIZADO
 * POST /api/oracle/procedure
 */
export async function procedureHandler(req: Request): Promise<Response> {
  const config = getConfigForEndpoint(req.url);
  
  try {
    // Usar timeout para la lectura del request
    const inputData = await withTimeout(
      req.json(),
      3000, // 3 segundos para leer el JSON
      "Timeout leyendo los datos de entrada"
    );
    
    console.log("🔧 Datos recibidos para procedimiento:", inputData);

    // Medir tiempo de procesamiento
    const { result, duration } = await measureTime(async () => {
      return await withRetry(() => {
        return Promise.resolve(processProcedureData(inputData, req));
      }, config.retries);
    });

    // Agregar información de performance
    if ('generatedAt' in result) {
      (result as ProcedureCallResponse).executionTime = duration;
    }
    
    if (duration > 5000) {
      console.log(`⚠️ Procedimiento lento detectado: ${duration}ms`);
    }

    return Response.json(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error procesando procedimiento";
    console.error("❌ Error en procedureHandler:", errorMessage);

    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };

    return Response.json(errorResponse, { status: 400 });
  }
}

// Función auxiliar para procesar los datos del procedimiento
async function processProcedureData(inputData: unknown, req: Request): Promise<ApiResponse> {
  const startTime = Date.now();
  let sessionId: string | undefined;
  const _dataSize = JSON.stringify(inputData).length;

  let result: ApiResponse;

  // Validar estructura de entrada
  if (Array.isArray(inputData)) {
    // Múltiples procedimientos
    console.log("🔧 Procesando múltiples procedimientos");
    
    // Validar que cada elemento tenga procedureName
    for (const proc of inputData) {
      if (!proc.procedureName || typeof proc.procedureName !== 'string') {
        throw new Error("Cada procedimiento debe tener un 'procedureName' válido");
      }
    }

    const procedureCall = generateMultipleProcedureCalls(inputData);
    
    // Log para SQL
    const processingTime = Date.now() - startTime;
    sessionId = await sqlLogger.logProcedureCall(req, inputData, procedureCall, {
      processingTime,
      dataSize: _dataSize
    });

    result = {
      success: true,
      inputType: "multiple-procedures",
      procedures: inputData.map((proc: { procedureName: string; parameters?: Record<string, unknown> }) => ({
        procedureName: proc.procedureName,
        parameterCount: proc.parameters ? Object.keys(proc.parameters).length : 0
      })),
      call: procedureCall,
      summary: {
        totalProcedures: inputData.length,
        generatedAt: new Date().toISOString()
      },
      sessionId
    } as MultipleProceduresResponse;

    console.log("🔧 Bloque PL/SQL generado para múltiples procedimientos:");
    console.log(procedureCall);
    
  } else if (inputData && typeof inputData === 'object') {
    // Procedimiento individual
    console.log("🔧 Procesando procedimiento individual");
    
    const data = inputData as Record<string, unknown>;
    const { procedureName, parameters = {} } = data;
    
    if (!procedureName || typeof procedureName !== 'string') {
      throw new Error("Se requiere un 'procedureName' válido");
    }

    const procedureCall = generateProcedureCall(procedureName, parameters as Record<string, unknown>);
    
    // Log para SQL
    const processingTime = Date.now() - startTime;
    sessionId = await sqlLogger.logProcedureCall(req, procedureName, procedureCall, {
      processingTime,
      dataSize: _dataSize
    });

    result = {
      success: true,
      inputType: "procedure",
      procedureName: procedureName,
      call: procedureCall,
      generatedAt: new Date().toISOString(),
      sessionId
    } as ProcedureCallResponse;

    console.log("🔧 Llamada a procedimiento generada:", procedureCall);
    
  } else {
    throw new Error("Formato de entrada inválido. Se espera un objeto con 'procedureName' y 'parameters' opcional, o un array de procedimientos");
  }

  return result;
}
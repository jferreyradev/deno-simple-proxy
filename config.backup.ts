/**
 * 🔧 Configuración centralizada del Deno Oracle Proxy
 * 
 * Este archivo contiene toda la configuración del sistema
 * Separado del main.ts para mejor mantenimiento
 */

export interface ServerConfig {
  port: number;
  corsEnabled: boolean;
  corsOptions?: {
    origins?: string[];
    credentials?: boolean;
    headers?: string[];
    methods?: string[];
  };
}

export interface LoggerConfig {
  logDir: string;
  fileName: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  maxFileSize: number;
  maxBackupFiles: number;
  includeTimestamp: boolean;
  consoleOutput: boolean;
}

export interface SqlLoggerConfig {
  logDir: string;
  fileName: string;
  maxFileSize: number;
  maxBackupFiles: number;
}

export interface DestinationApiConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
}

export interface DestinationRouteConfig {
  pattern: string;
  destination: DestinationApiConfig;
  description?: string;
}

export interface EndpointTransformerConfig {
  pattern: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
}

export interface ProxyConfig {
  server: ServerConfig;
  logger: LoggerConfig;
  sqlLogger: SqlLoggerConfig;
  destinationApi?: DestinationApiConfig; // API destino por defecto (retrocompatibilidad)
  destinationRoutes: DestinationRouteConfig[]; // Múltiples destinos por endpoint
  endpointTransformers: EndpointTransformerConfig[];
}

// 🔧 Configuración por defecto
const defaultConfig: ProxyConfig = {
  server: {
    port: parseInt(Deno.env.get("PORT") || "8003"),
    corsEnabled: true,
    corsOptions: {
      origins: ["*"], // Por defecto permite todos los orígenes
      credentials: false,
      headers: ["Content-Type", "Authorization", "X-API-Key"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
  },

  logger: {
    logDir: Deno.env.get("LOG_DIR") || "./logs",
    fileName: Deno.env.get("LOG_FILE") || "proxy.log",
    level: (Deno.env.get("LOG_LEVEL") as "DEBUG" | "INFO" | "WARN" | "ERROR") || "INFO",
    maxFileSize: parseInt(Deno.env.get("LOG_MAX_SIZE") || "5242880"), // 5MB
    maxBackupFiles: parseInt(Deno.env.get("LOG_MAX_BACKUPS") || "10"),
    includeTimestamp: true,
    consoleOutput: Deno.env.get("LOG_CONSOLE") !== "false"
  },

  sqlLogger: {
    logDir: Deno.env.get("SQL_LOG_DIR") || "./logs",
    fileName: Deno.env.get("SQL_LOG_FILE") || "sql-inserts.log",
    maxFileSize: parseInt(Deno.env.get("SQL_LOG_MAX_SIZE") || "52428800"), // 50MB
    maxBackupFiles: parseInt(Deno.env.get("SQL_LOG_MAX_BACKUPS") || "15")
  },

  destinationApi: Deno.env.get("DESTINATION_URL") ? {
    url: Deno.env.get("DESTINATION_URL")!,
    method: (Deno.env.get("DESTINATION_METHOD") as "GET" | "POST" | "PUT" | "DELETE") || "POST",
    headers: {
      "Authorization": Deno.env.get("DESTINATION_AUTH") || "Bearer demo",
      "Content-Type": "application/json",
      "X-Source": "deno-oracle-proxy"
    }
  } : undefined,

  // 🎯 Múltiples destinos por endpoint
  destinationRoutes: [
    {
      pattern: "/api/oracle/convert",
      description: "SQL Oracle principal",
      destination: {
        url: Deno.env.get("ORACLE_API_URL") || "http://10.6.46.114:8083/exec",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("ORACLE_API_TOKEN") || "Bearer demo",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy"
        }
      }
    },
    {
      pattern: "/api/oracle/batch",
      description: "Operaciones batch Oracle",
      destination: {
        url: Deno.env.get("BATCH_API_URL") || "http://10.6.46.114:8081/batch",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("BATCH_API_TOKEN") || "Bearer batch-token",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy",
          "X-Operation": "batch"
        }
      }
    },
    {
      pattern: "/api/validate",
      description: "Validación de datos",
      destination: {
        url: Deno.env.get("VALIDATION_API_URL") || "http://10.6.46.114:8082/validate",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("VALIDATION_API_TOKEN") || "Bearer validation-token",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy",
          "X-Operation": "validate"
        }
      }
    },
    {
      pattern: "/api/health",
      description: "Health check distribuido",
      destination: {
        url: Deno.env.get("HEALTH_API_URL") || "http://10.6.46.114:8080/health",
        method: "GET",
        headers: {
          "X-Source": "deno-oracle-proxy",
          "X-Check": "distributed"
        }
      }
    },
    // 🆕 NUEVOS ENDPOINTS - Agrega los tuyos aquí:
    {
      pattern: "/api/reports",
      description: "Generación de reportes",
      destination: {
        url: Deno.env.get("REPORTS_API_URL") || "http://10.6.46.114:8084/reports",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("REPORTS_API_TOKEN") || "Bearer reports-token",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy",
          "X-Operation": "report"
        }
      }
    },
    {
      pattern: "/api/analytics",
      description: "Análisis de datos",
      destination: {
        url: Deno.env.get("ANALYTICS_API_URL") || "http://analytics-server:9000/analyze",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("ANALYTICS_API_TOKEN") || "Bearer analytics-token",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy",
          "X-Operation": "analytics"
        }
      }
    },
    {
      pattern: "/api/backup",
      description: "Respaldo de datos",
      destination: {
        url: Deno.env.get("BACKUP_API_URL") || "http://backup-server:7000/backup",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("BACKUP_API_TOKEN") || "Bearer backup-token",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy",
          "X-Operation": "backup"
        }
      }
    },
    // 🎯 EJEMPLO: Agregar endpoint de ventas
    {
      pattern: "/api/ventas",
      description: "Sistema de ventas",
      destination: {
        url: Deno.env.get("VENTAS_API_URL") || "http://ventas-server:8080/procesar",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("VENTAS_API_TOKEN") || "Bearer ventas-token",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy",
          "X-Operation": "ventas"
        }
      }
    },
    // 🔧 EJEMPLO: Agregar endpoint de procesamiento
    {
      pattern: "/api/oracle/proc",
      description: "Procesamiento de datos",
      destination: {
        url: Deno.env.get("PROC_API_URL") || "http://10.6.46.114:8083/procedure",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("PROC_API_TOKEN") || "Bearer demo",
          "Content-Type": "application/json",
          "X-Source": "deno-oracle-proxy",
          "X-Operation": "process"
        }
      }
    }
  ],

  endpointTransformers: [
    {
      pattern: "*/exec",
      method: "POST",
      headers: {
        "X-Source": "deno-proxy",
        "X-Format": "query-only"
      }
    },
    {
      pattern: "*10.6.46.114:8081*",
      method: "POST",
      headers: {
        "Authorization": Deno.env.get("API_8081_TOKEN") || "Bearer tu-token-especifico-aqui",
        "Content-Type": "application/json",
        "X-Source": "deno-oracle-proxy",
        "X-API-Version": "v1"
      }
    },
    {
      pattern: "localhost:*",
      method: "POST",
      headers: {
        "X-Environment": "development",
        "X-Debug": "true"
      }
    },
    {
      pattern: "*api.empresa.com*",
      headers: {
        "Authorization": Deno.env.get("EMPRESA_API_TOKEN") || "Bearer your-token-here",
        "X-Company-Format": "v1"
      }
    }
  ]
};

// 🔧 Función para merge profundo de configuración
function mergeConfig(base: ProxyConfig, override: Partial<ProxyConfig>): ProxyConfig {
  return {
    server: { ...base.server, ...override.server },
    logger: { ...base.logger, ...override.logger },
    sqlLogger: { ...base.sqlLogger, ...override.sqlLogger },
    destinationApi: override.destinationApi || base.destinationApi,
    destinationRoutes: override.destinationRoutes || base.destinationRoutes,
    endpointTransformers: override.endpointTransformers || base.endpointTransformers
  };
}

// 🔧 Función para obtener configuración (permite override)
export function getConfig(overrides?: Partial<ProxyConfig>): ProxyConfig {
  if (!overrides) {
    return defaultConfig;
  }
  return mergeConfig(defaultConfig, overrides);
}

// 🔧 Configuraciones específicas por ambiente
export const environments = {
  development: {
    server: {
      port: 8003,
      corsEnabled: true
    },
    logger: {
      logDir: "./logs",
      fileName: "proxy.log",
      level: "DEBUG" as const,
      maxFileSize: 5242880,
      maxBackupFiles: 10,
      includeTimestamp: true,
      consoleOutput: true
    }
  },

  production: {
    server: {
      port: 8080,
      corsEnabled: true,
      corsOptions: {
        origins: ["https://tu-frontend.com"], // Solo dominios específicos
        credentials: true
      }
    },
    logger: {
      logDir: "./logs",
      fileName: "proxy.log",
      level: "INFO" as const,
      maxFileSize: 5242880,
      maxBackupFiles: 10,
      includeTimestamp: true,
      consoleOutput: false
    }
  },

  testing: {
    server: {
      port: 0, // Puerto aleatorio para tests
      corsEnabled: false
    },
    logger: {
      logDir: "./logs",
      fileName: "proxy.log",
      level: "ERROR" as const,
      maxFileSize: 5242880,
      maxBackupFiles: 10,
      includeTimestamp: true,
      consoleOutput: false
    }
  }
};

// 🔧 Función para cargar configuración por ambiente
export function getConfigForEnvironment(env: keyof typeof environments = "development"): ProxyConfig {
  const envConfig = environments[env];
  return mergeConfig(defaultConfig, envConfig);
}
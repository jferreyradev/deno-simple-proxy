// 🔧 Configuración centralizada del Proxy Deno Oracle
// Archivo de configuración separado de la lógica de servidor

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
  description: string;
  destination: DestinationApiConfig;
}

export interface EndpointTransformerConfig {
  pattern: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
}

export interface ProxyConfig {
  port: number;
  corsEnabled: boolean;
  logger: LoggerConfig;
  sqlLogger: SqlLoggerConfig;
  destinationRoutes: DestinationRouteConfig[];
  endpointTransformers: EndpointTransformerConfig[];
  defaultBearerToken: string;
}

// 🌍 Configuración de desarrollo
const developmentConfig: ProxyConfig = {
  port: parseInt(Deno.env.get("PORT") || "8003"),
  corsEnabled: true,
  
  logger: {
    logDir: "./logs",
    fileName: "proxy.log",
    level: "INFO",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxBackupFiles: 5,
    includeTimestamp: true,
    consoleOutput: true
  },

  sqlLogger: {
    logDir: "./logs",
    fileName: "sql-inserts.log",
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxBackupFiles: 3
  },

  defaultBearerToken: Deno.env.get("DEFAULT_BEARER_TOKEN") || "demo",

  // 🎯 Destinos específicos por endpoint
  destinationRoutes: [
    // 🔗 Endpoints Oracle esenciales
    {
      pattern: "/api/oracle/convert",
      description: "SQL Oracle principal",
      destination: {
        url: Deno.env.get("ORACLE_API_URL") || "http://10.6.46.114:8083/exec",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("ORACLE_API_TOKEN") || "Bearer demo",
          "Content-Type": "application/json"
        }
      }
    },
    {
      pattern: "/api/oracle/batch",
      description: "Operaciones batch Oracle",
      destination: {
        url: Deno.env.get("ORACLE_BATCH_API_URL") || "http://10.6.46.114:8081/batch",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("ORACLE_BATCH_API_TOKEN") || "Bearer demo",
          "Content-Type": "application/json"
        }
      }
    },
    {
      pattern: "/api/oracle/proc",
      description: "Procesamiento de datos Oracle",
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
    },
    // 🔧 Endpoints de API básicos
    {
      pattern: "/api/validate",
      description: "Validación de datos",
      destination: {
        url: Deno.env.get("VALIDATE_API_URL") || "http://10.6.46.114:8082/validate",
        method: "POST",
        headers: {
          "Authorization": Deno.env.get("VALIDATE_API_TOKEN") || "Bearer demo",
          "Content-Type": "application/json"
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

// 🚀 Configuración de producción
const productionConfig: ProxyConfig = {
  ...developmentConfig,
  port: parseInt(Deno.env.get("PORT") || "8080"),
  logger: {
    ...developmentConfig.logger,
    level: "ERROR",
    consoleOutput: false
  }
};

// 🧪 Configuración de testing
const testConfig: ProxyConfig = {
  ...developmentConfig,
  port: parseInt(Deno.env.get("PORT") || "8001"),
  logger: {
    ...developmentConfig.logger,
    level: "DEBUG",
    fileName: "proxy-test.log"
  }
};

/**
 * 🌍 Obtiene la configuración basada en el entorno
 */
export function getConfig(): ProxyConfig {
  const env = Deno.env.get("DENO_ENV") || "development";
  
  switch (env) {
    case "production":
      return productionConfig;
    case "test":
      return testConfig;
    default:
      return developmentConfig;
  }
}

/**
 * 🎯 Obtiene configuración específica para un entorno
 */
export function getConfigForEnvironment(environment: "development" | "production" | "test"): ProxyConfig {
  switch (environment) {
    case "production":
      return productionConfig;
    case "test":
      return testConfig;
    case "development":
    default:
      return developmentConfig;
  }
}
/**
 * 📊 Tipos y interfaces para el sistema Oracle SQL
 */

export interface TableResult {
  tableName: string;
  recordCount: number;
  inserts: string[];
  batchInsert: string;
}

export interface SingleObjectResponse {
  success: true;
  inputType: "object";
  tableName: string;
  insert: string;
  generatedAt: string;
  sessionId?: string; // ID de sesión para tracking de logs
}

export interface ArrayResponse {
  success: true;
  inputType: "array";
  tables: TableResult[];
  summary: {
    totalTables: number;
    totalRecords: number;
    generatedAt: string;
    sessionId?: string; // ID de sesión para tracking de logs
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  timestamp?: string;
  help?: string;
  example?: {
    single: Record<string, unknown>;
    array: Array<Record<string, unknown>>;
  };
}

export interface ProcedureCallResponse {
  success: true;
  inputType: "procedure";
  procedureName: string;
  call: string;
  generatedAt: string;
  sessionId?: string;
  executionTime?: number; // Tiempo de ejecución en ms
}

export interface MultipleProceduresResponse {
  success: true;
  inputType: "multiple-procedures";
  procedures: {
    procedureName: string;
    parameterCount: number;
  }[];
  call: string;
  summary: {
    totalProcedures: number;
    generatedAt: string;
  };
  sessionId?: string;
}

export type ApiResponse = SingleObjectResponse | ArrayResponse | ProcedureCallResponse | MultipleProceduresResponse | ErrorResponse;

export interface ForwardResponse {
  error?: string;
  status?: number;
  details?: unknown;
  [key: string]: unknown;
}

export interface ForwardResult {
  success: boolean;
  response: ForwardResponse | null;
  destinationUrl: string | null;
}

// Configuración de timeouts y performance
export interface ProxyConfig {
  timeout: number; // Timeout en ms
  retries: number; // Número de reintentos
  enableCache: boolean; // Cache de respuestas
  maxResponseSize: number; // Tamaño máximo de respuesta en bytes
}
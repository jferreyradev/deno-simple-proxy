/**
 * 📊 Tipos y interfaces para el sistema Oracle SQL
 */

export interface TableResult {
  tableName: string;
  recordCount: number;
  inserts: string[];
  createTable: string;
  batchInsert: string;
}

export interface SingleObjectResponse {
  success: true;
  inputType: "object";
  tableName: string;
  insert: string;
  createTable: string;
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
  help: string;
  example: {
    single: Record<string, unknown>;
    array: Array<Record<string, unknown>>;
  };
}

export type ApiResponse = SingleObjectResponse | ArrayResponse | ErrorResponse;

export interface ForwardResponse {
  success: boolean;
  error?: string;
  status?: number;
  data?: unknown;
  url?: string;
  destinationUrl?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface ForwardResult {
  success: boolean;
  response: ForwardResponse | null;
  destinationUrl: string | null;
}
/**
 * Logger especializado para SQL INSERTs
 * Registra todos los INSERT generados en un archivo separado
 */

export interface SqlLogEntry {
  /** Timestamp de la generación */
  timestamp: string;
  /** ID único de la sesión/petición */
  sessionId: string;
  /** Tipo de operación (single, array, etc.) */
  operationType: 'single' | 'array' | 'batch';
  /** Tabla(s) procesada(s) */
  tables: string[];
  /** Número total de INSERTs generados */
  insertCount: number;
  /** Información del origen de datos */
  sourceInfo: {
    method: string;
    url: string;
    userAgent?: string;
    ip?: string;
  };
  /** Los INSERT SQL generados */
  sqlStatements: string[];
  /** Información adicional */
  metadata?: {
    processingTime?: number;
    dataSize?: number;
    [key: string]: unknown;
  };
}

export class SqlLogger {
  private logDir: string;
  private fileName: string;
  private maxFileSize: number;
  private maxBackupFiles: number;

  constructor(config: {
    logDir?: string;
    fileName?: string;
    maxFileSize?: number;
    maxBackupFiles?: number;
  } = {}) {
    this.logDir = config.logDir || './logs';
    this.fileName = config.fileName || 'sql-inserts.log';
    this.maxFileSize = config.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.maxBackupFiles = config.maxBackupFiles || 10;
    
    this.ensureLogDir();
  }

  /**
   * Asegurar que el directorio de logs exista
   */
  private async ensureLogDir(): Promise<void> {
    try {
      await Deno.stat(this.logDir);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await Deno.mkdir(this.logDir, { recursive: true });
      }
    }
  }

  /**
   * Generar un ID único para la sesión
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verificar si el archivo debe rotarse
   */
  private async shouldRotate(): Promise<boolean> {
    try {
      const currentLogPath = `${this.logDir}/${this.fileName}`;
      const stat = await Deno.stat(currentLogPath);
      return stat.size >= this.maxFileSize;
    } catch {
      return false;
    }
  }

  /**
   * Rotar archivos de log
   */
  private async rotateFiles(): Promise<void> {
    const baseName = this.fileName.replace(/\.[^/.]+$/, "");
    const extension = this.fileName.match(/\.[^/.]+$/)?.[0] || '';
    
    // Mover archivos existentes
    for (let i = this.maxBackupFiles - 1; i >= 1; i--) {
      const oldFile = `${this.logDir}/${baseName}.${i}${extension}`;
      const newFile = `${this.logDir}/${baseName}.${i + 1}${extension}`;
      
      try {
        await Deno.stat(oldFile);
        if (i === this.maxBackupFiles - 1) {
          await Deno.remove(oldFile);
        } else {
          await Deno.rename(oldFile, newFile);
        }
      } catch {
        // Archivo no existe, continuar
      }
    }
    
    // Mover archivo actual al .1
    const currentFile = `${this.logDir}/${this.fileName}`;
    const firstBackup = `${this.logDir}/${baseName}.1${extension}`;
    
    try {
      await Deno.rename(currentFile, firstBackup);
    } catch {
      // Archivo no existe, crear nuevo
    }
  }

  /**
   * Formatear entrada de log SQL
   */
  private formatSqlLogEntry(entry: SqlLogEntry): string {
    const separator = "=".repeat(80);
    const timestamp = new Date(entry.timestamp).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    let logText = `\n${separator}\n`;
    logText += `🕒 TIMESTAMP: ${timestamp}\n`;
    logText += `🆔 SESSION ID: ${entry.sessionId}\n`;
    logText += `📊 OPERATION: ${entry.operationType.toUpperCase()}\n`;
    logText += `🗃️  TABLES: ${entry.tables.join(', ')}\n`;
    logText += `📝 INSERT COUNT: ${entry.insertCount}\n`;
    logText += `🌐 SOURCE: ${entry.sourceInfo.method} ${entry.sourceInfo.url}\n`;
    
    if (entry.sourceInfo.ip) {
      logText += `🔍 IP: ${entry.sourceInfo.ip}\n`;
    }
    
    if (entry.sourceInfo.userAgent) {
      logText += `🖥️  USER AGENT: ${entry.sourceInfo.userAgent}\n`;
    }

    if (entry.metadata?.processingTime) {
      logText += `⏱️  PROCESSING TIME: ${entry.metadata.processingTime}ms\n`;
    }

    if (entry.metadata?.dataSize) {
      logText += `📏 DATA SIZE: ${entry.metadata.dataSize} bytes\n`;
    }

    logText += `${separator}\n`;
    logText += `📋 SQL STATEMENTS:\n\n`;

    // Agrupar por tabla si es posible
    const statementsByTable: Record<string, string[]> = {};
    
    entry.sqlStatements.forEach((sql, index) => {
      // Extraer nombre de tabla del INSERT
      const tableMatch = sql.match(/INSERT INTO (\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : 'UNKNOWN';
      
      if (!statementsByTable[tableName]) {
        statementsByTable[tableName] = [];
      }
      statementsByTable[tableName].push(`-- Statement ${index + 1}\n${sql}`);
    });

    // Escribir statements agrupados por tabla
    Object.entries(statementsByTable).forEach(([tableName, statements]) => {
      logText += `\n-- 🗂️  TABLE: ${tableName} (${statements.length} statements)\n`;
      logText += statements.join('\n\n');
      logText += '\n';
    });

    logText += `\n${separator}\n`;

    return logText;
  }

  /**
   * Escribir log SQL al archivo
   */
  private async writeToFile(content: string): Promise<void> {
    await this.ensureLogDir();
    
    if (await this.shouldRotate()) {
      await this.rotateFiles();
    }
    
    const logPath = `${this.logDir}/${this.fileName}`;
    
    try {
      await Deno.writeTextFile(logPath, content, { append: true });
    } catch (error) {
      console.error('❌ Error escribiendo log SQL:', error);
    }
  }

  /**
   * Registrar INSERT SQL generado para un objeto único
   */
  async logSingleInsert(
    request: Request,
    tableName: string,
    sqlStatement: string,
    metadata?: { processingTime?: number; dataSize?: number }
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const entry: SqlLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      operationType: 'single',
      tables: [tableName],
      insertCount: 1,
      sourceInfo: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      },
      sqlStatements: [sqlStatement],
      metadata
    };

    const formattedLog = this.formatSqlLogEntry(entry);
    await this.writeToFile(formattedLog);
    
    return sessionId;
  }

  /**
   * Registrar múltiples INSERTs para un array de datos
   */
  async logArrayInserts(
    request: Request,
    sqlResults: { tableName: string; inserts: string[] }[],
    metadata?: { processingTime?: number; dataSize?: number }
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const allStatements: string[] = [];
    const tables: string[] = [];
    let totalInserts = 0;

    sqlResults.forEach(result => {
      tables.push(result.tableName);
      allStatements.push(...result.inserts);
      totalInserts += result.inserts.length;
    });

    const entry: SqlLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      operationType: 'array',
      tables: [...new Set(tables)], // Eliminar duplicados
      insertCount: totalInserts,
      sourceInfo: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      },
      sqlStatements: allStatements,
      metadata
    };

    const formattedLog = this.formatSqlLogEntry(entry);
    await this.writeToFile(formattedLog);
    
    return sessionId;
  }

  /**
   * Registrar batch de múltiples operaciones
   */
  async logBatchInserts(
    request: Request,
    operations: Array<{
      type: 'single' | 'array';
      tableName: string;
      statements: string[];
    }>,
    metadata?: { processingTime?: number; dataSize?: number }
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const allStatements: string[] = [];
    const tables: string[] = [];
    let totalInserts = 0;

    operations.forEach(op => {
      tables.push(op.tableName);
      allStatements.push(...op.statements);
      totalInserts += op.statements.length;
    });

    const entry: SqlLogEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      operationType: 'batch',
      tables: [...new Set(tables)],
      insertCount: totalInserts,
      sourceInfo: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      },
      sqlStatements: allStatements,
      metadata
    };

    const formattedLog = this.formatSqlLogEntry(entry);
    await this.writeToFile(formattedLog);
    
    return sessionId;
  }

  /**
   * Obtener estadísticas del log SQL
   */
  async getStats(): Promise<{
    fileSize: number;
    maxFileSize: number;
    rotationNeeded: boolean;
    logPath: string;
  }> {
    try {
      const logPath = `${this.logDir}/${this.fileName}`;
      const stat = await Deno.stat(logPath);
      
      return {
        fileSize: stat.size,
        maxFileSize: this.maxFileSize,
        rotationNeeded: stat.size >= this.maxFileSize,
        logPath
      };
    } catch {
      return {
        fileSize: 0,
        maxFileSize: this.maxFileSize,
        rotationNeeded: false,
        logPath: `${this.logDir}/${this.fileName}`
      };
    }
  }

  /**
   * Buscar logs por criterios
   */
  async searchLogs(criteria: {
    sessionId?: string;
    tableName?: string;
    dateFrom?: Date;
    dateTo?: Date;
    maxResults?: number;
  }): Promise<string[]> {
    try {
      const logPath = `${this.logDir}/${this.fileName}`;
      const content = await Deno.readTextFile(logPath);
      
      const entries = content.split('='.repeat(80)).filter(entry => entry.trim());
      const results: string[] = [];
      
      for (const entry of entries) {
        if (criteria.maxResults && results.length >= criteria.maxResults) break;
        
        let matches = true;
        
        if (criteria.sessionId && !entry.includes(`SESSION ID: ${criteria.sessionId}`)) {
          matches = false;
        }
        
        if (criteria.tableName && !entry.includes(`TABLES: ${criteria.tableName}`) && 
            !entry.includes(`TABLE: ${criteria.tableName}`)) {
          matches = false;
        }
        
        if (matches) {
          results.push('=' + '='.repeat(79) + entry);
        }
      }
      
      return results;
    } catch {
      return [];
    }
  }
}

// Instancia global del logger SQL
export const sqlLogger = new SqlLogger();

// Función para configurar el logger SQL
export function configureSqlLogger(config: {
  logDir?: string;
  fileName?: string;
  maxFileSize?: number;
  maxBackupFiles?: number;
}): void {
  // Crear nueva instancia con la configuración
  const newLogger = new SqlLogger(config);
  // Reemplazar la instancia global (esto es una simplificación)
  Object.assign(sqlLogger, newLogger);
}
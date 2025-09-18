/**
 * Sistema de logging avanzado para Deno
 * Incluye rotación automática, diferentes niveles y formateo
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogData = string | number | boolean | object | null | undefined;

export interface LogStats {
  currentFileSize: number;
  maxFileSize: number;
  rotationNeeded: boolean;
  logLevel: LogLevel;
  logDir: string;
  fileName: string;
}

export interface ApiResponse {
  status: number;
  data?: unknown;
  text?: string;
}

export interface LoggerConfig {
  /** Directorio donde se guardarán los logs */
  logDir: string;
  /** Nombre base del archivo de log */
  fileName: string;
  /** Nivel mínimo de logging */
  level: LogLevel;
  /** Tamaño máximo del archivo en bytes (default: 10MB) */
  maxFileSize: number;
  /** Número máximo de archivos de backup */
  maxBackupFiles: number;
  /** Si incluir timestamps en los logs */
  includeTimestamp: boolean;
  /** Si loggear también en consola */
  consoleOutput: boolean;
  /** Formato de fecha personalizado */
  dateFormat?: string;
}

export class Logger {
  private config: LoggerConfig;
  private levels: Record<LogLevel, number> = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      logDir: './logs',
      fileName: 'app.log',
      level: 'INFO',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxBackupFiles: 5,
      includeTimestamp: true,
      consoleOutput: true,
      ...config
    };

    // Crear directorio de logs si no existe
    this.ensureLogDir();
  }

  /**
   * Asegurar que el directorio de logs exista
   */
  private async ensureLogDir(): Promise<void> {
    try {
      await Deno.stat(this.config.logDir);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await Deno.mkdir(this.config.logDir, { recursive: true });
      }
    }
  }

  /**
   * Obtener timestamp formateado
   */
  private getTimestamp(): string {
    const now = new Date();
    if (this.config.dateFormat) {
      return now.toLocaleString('es-AR', { 
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
    return now.toISOString();
  }

  /**
   * Formatear mensaje de log
   */
  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    let logLine = '';
    
    if (this.config.includeTimestamp) {
      logLine += `[${this.getTimestamp()}] `;
    }
    
    logLine += `[${level}] ${message}`;
    
    if (data !== undefined) {
      if (typeof data === 'object') {
        logLine += ` | ${JSON.stringify(data, null, 2)}`;
      } else {
        logLine += ` | ${data}`;
      }
    }
    
    return logLine + '\n';
  }

  /**
   * Verificar si el archivo debe rotarse
   */
  private async shouldRotate(): Promise<boolean> {
    try {
      const currentLogPath = `${this.config.logDir}/${this.config.fileName}`;
      const stat = await Deno.stat(currentLogPath);
      return stat.size >= this.config.maxFileSize;
    } catch {
      return false;
    }
  }

  /**
   * Rotar archivos de log
   */
  private async rotateFiles(): Promise<void> {
    const baseName = this.config.fileName.replace(/\.[^/.]+$/, "");
    const extension = this.config.fileName.match(/\.[^/.]+$/)?.[0] || '';
    
    // Mover archivos existentes
    for (let i = this.config.maxBackupFiles - 1; i >= 1; i--) {
      const oldFile = `${this.config.logDir}/${baseName}.${i}${extension}`;
      const newFile = `${this.config.logDir}/${baseName}.${i + 1}${extension}`;
      
      try {
        await Deno.stat(oldFile);
        if (i === this.config.maxBackupFiles - 1) {
          await Deno.remove(oldFile); // Eliminar el más antiguo
        } else {
          await Deno.rename(oldFile, newFile);
        }
      } catch {
        // Archivo no existe, continuar
      }
    }
    
    // Mover archivo actual al .1
    const currentFile = `${this.config.logDir}/${this.config.fileName}`;
    const firstBackup = `${this.config.logDir}/${baseName}.1${extension}`;
    
    try {
      await Deno.rename(currentFile, firstBackup);
    } catch {
      // Archivo no existe, crear nuevo
    }
  }

  /**
   * Escribir log al archivo
   */
  private async writeToFile(formattedMessage: string): Promise<void> {
    await this.ensureLogDir();
    
    if (await this.shouldRotate()) {
      await this.rotateFiles();
    }
    
    const logPath = `${this.config.logDir}/${this.config.fileName}`;
    
    try {
      await Deno.writeTextFile(logPath, formattedMessage, { append: true });
    } catch (error) {
      console.error('Error escribiendo log:', error);
    }
  }

  /**
   * Verificar si el nivel debe loggearse
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.config.level];
  }

  /**
   * Método principal de logging
   */
  private async log(level: LogLevel, message: string, data?: LogData): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, data);
    
    // Log a consola si está habilitado
    if (this.config.consoleOutput) {
      const consoleMethod = level === 'ERROR' ? 'error' : 
                           level === 'WARN' ? 'warn' : 
                           level === 'DEBUG' ? 'debug' : 'log';
      console[consoleMethod](formattedMessage.trim());
    }
    
    // Escribir a archivo
    await this.writeToFile(formattedMessage);
  }

  /**
   * Métodos de logging por nivel
   */
  async debug(message: string, data?: LogData): Promise<void> {
    await this.log('DEBUG', message, data);
  }

  async info(message: string, data?: LogData): Promise<void> {
    await this.log('INFO', message, data);
  }

  async warn(message: string, data?: LogData): Promise<void> {
    await this.log('WARN', message, data);
  }

  async error(message: string, data?: LogData): Promise<void> {
    await this.log('ERROR', message, data);
  }

  /**
   * Loggear petición HTTP
   */
  async logRequest(request: Request, startTime: number): Promise<void> {
    const duration = Date.now() - startTime;
    const logData = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      duration: `${duration}ms`
    };
    
    await this.info(`HTTP Request: ${request.method} ${request.url}`, logData);
  }

  /**
   * Loggear respuesta HTTP
   */
  async logResponse(request: Request, response: Response, startTime: number): Promise<void> {
    const duration = Date.now() - startTime;
    const logData = {
      method: request.method,
      url: request.url,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    };
    
    const level = response.status >= 400 ? 'ERROR' : 'INFO';
    await this.log(level, `HTTP Response: ${response.status} ${request.method} ${request.url}`, logData);
  }

  /**
   * Loggear datos procesados
   */
  async logDataProcessing(operation: string, input: LogData, output: LogData, duration?: number): Promise<void> {
    const logData = {
      operation,
      inputSize: typeof input === 'string' ? input.length : JSON.stringify(input).length,
      outputSize: typeof output === 'string' ? output.length : JSON.stringify(output).length,
      duration: duration ? `${duration}ms` : undefined,
      inputPreview: typeof input === 'object' ? JSON.stringify(input).substring(0, 200) + '...' : input,
      outputPreview: typeof output === 'object' ? JSON.stringify(output).substring(0, 200) + '...' : output
    };
    
    await this.info(`Data Processing: ${operation}`, logData);
  }

  /**
   * Loggear reenvío a API externa
   */
  async logApiForward(destinationUrl: string, method: string, request: LogData, response: ApiResponse, duration: number): Promise<void> {
    const logData = {
      destination: destinationUrl,
      method,
      requestData: request,
      responseStatus: response.status,
      responseData: response.data || response.text || 'No data',
      duration: `${duration}ms`,
      success: response.status >= 200 && response.status < 300
    };
    
    const level = response.status >= 400 ? 'ERROR' : 'INFO';
    await this.log(level, `API Forward: ${method} ${destinationUrl}`, logData);
  }

  /**
   * Cambiar configuración en tiempo de ejecución
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtener estadísticas de logging
   */
  async getLogStats(): Promise<LogStats> {
    try {
      const logPath = `${this.config.logDir}/${this.config.fileName}`;
      const stat = await Deno.stat(logPath);
      
      return {
        currentFileSize: stat.size,
        maxFileSize: this.config.maxFileSize,
        rotationNeeded: stat.size >= this.config.maxFileSize,
        logLevel: this.config.level,
        logDir: this.config.logDir,
        fileName: this.config.fileName
      };
    } catch {
      return {
        currentFileSize: 0,
        maxFileSize: this.config.maxFileSize,
        rotationNeeded: false,
        logLevel: this.config.level,
        logDir: this.config.logDir,
        fileName: this.config.fileName
      };
    }
  }

  /**
   * 📖 Lee los logs recientes del archivo
   * @param maxLines - Máximo número de líneas a leer
   * @returns Array de logs parseados
   */
  async getRecentLogs(maxLines: number = 100): Promise<Array<{
    timestamp?: string;
    level?: LogLevel;
    message?: string;
    data?: unknown;
    raw?: string;
  }>> {
    try {
      const logFilePath = `${this.config.logDir}/${this.config.fileName}`;
      const logContent = await Deno.readTextFile(logFilePath);
      
      // Dividir en líneas y tomar las últimas
      const lines = logContent.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(-maxLines);
      
      return lines.map(line => {
        try {
          // Intentar parsear como JSON estructurado
          if (line.startsWith('[') && line.includes(']{')) {
            const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)/);
            if (match) {
              const [, timestamp, level, rest] = match;
              try {
                const data = JSON.parse(rest);
                return {
                  timestamp,
                  level: level as LogLevel,
                  message: typeof data === 'string' ? data : data.message || '',
                  data: typeof data === 'object' ? data : undefined,
                  raw: line
                };
              } catch {
                return {
                  timestamp,
                  level: level as LogLevel,
                  message: rest,
                  raw: line
                };
              }
            }
          }
          
          // Si no se puede parsear, devolver raw
          return {
            raw: line,
            message: line
          };
        } catch {
          return {
            raw: line,
            message: line
          };
        }
      });
    } catch (error) {
      console.warn(`No se pudieron leer los logs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

// Instancia global del logger
export const logger = new Logger();

// Función para configurar el logger globalmente
export function configureLogger(config: Partial<LoggerConfig>): void {
  logger.updateConfig(config);
}
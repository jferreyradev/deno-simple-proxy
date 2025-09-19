/**
 * ⚙️ Configuración del proxy y optimizaciones de performance
 */

import { ProxyConfig } from "./types.ts";

export const DEFAULT_CONFIG: ProxyConfig = {
  timeout: 10000, // 10 segundos
  retries: 2,
  enableCache: false, // Deshabilitado por defecto para procedimientos
  maxResponseSize: 5 * 1024 * 1024, // 5MB
};

export const PERFORMANCE_CONFIG = {
  // Configuración para requests rápidos
  FAST: {
    timeout: 3000, // 3 segundos
    retries: 1,
    enableCache: true,
    maxResponseSize: 1024 * 1024, // 1MB
  },
  
  // Configuración para procedimientos largos
  SLOW: {
    timeout: 30000, // 30 segundos
    retries: 3,
    enableCache: false,
    maxResponseSize: 10 * 1024 * 1024, // 10MB
  },
  
  // Configuración por defecto
  DEFAULT: DEFAULT_CONFIG
};

export function getConfigForEndpoint(url: string): ProxyConfig {
  if (url.includes('/procedimiento') || url.includes('/procedure')) {
    return PERFORMANCE_CONFIG.SLOW;
  }
  
  if (url.includes('/health') || url.includes('/info')) {
    return PERFORMANCE_CONFIG.FAST;
  }
  
  return PERFORMANCE_CONFIG.DEFAULT;
}

// Función para timeout con Promise.race
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  errorMessage = 'Operación excedió el timeout'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

// Función para retry con backoff exponencial
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Backoff exponencial: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`🔄 Reintentando en ${delay}ms... (intento ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Función para medir tiempo de ejecución
export function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  
  return fn().then(result => ({
    result,
    duration: Math.round(performance.now() - start)
  }));
}
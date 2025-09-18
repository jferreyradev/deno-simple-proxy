/**
 * 🛣️ Sistema de routing para múltiples endpoints
 */

export interface Route {
  method: string;
  path: string;
  handler: (req: Request, params?: Record<string, string>) => Promise<Response>;
  description?: string;
}

export interface RouteParams {
  [key: string]: string;
}

/**
 * Router simple para manejar múltiples endpoints
 */
export class Router {
  private routes: Route[] = [];

  /**
   * Registra una nueva ruta
   * @param method - Método HTTP (GET, POST, PUT, DELETE, etc.)
   * @param path - Ruta del endpoint (/api/users, /health, etc.)
   * @param handler - Función que maneja la petición
   * @param description - Descripción del endpoint
   */
  add(method: string, path: string, handler: Route['handler'], description?: string): void {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      handler,
      description
    });
  }

  /**
   * Métodos de conveniencia para HTTP
   */
  get(path: string, handler: Route['handler'], description?: string): void {
    this.add('GET', path, handler, description);
  }

  post(path: string, handler: Route['handler'], description?: string): void {
    this.add('POST', path, handler, description);
  }

  put(path: string, handler: Route['handler'], description?: string): void {
    this.add('PUT', path, handler, description);
  }

  delete(path: string, handler: Route['handler'], description?: string): void {
    this.add('DELETE', path, handler, description);
  }

  /**
   * Busca una ruta que coincida con la petición
   * @param method - Método HTTP
   * @param pathname - Ruta de la URL
   * @returns Ruta encontrada y parámetros extraídos
   */
  findRoute(method: string, pathname: string): { route: Route; params: RouteParams } | null {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;

      const match = this.matchPath(route.path, pathname);
      if (match) {
        return { route, params: match };
      }
    }
    return null;
  }

  /**
   * Compara una ruta con parámetros contra una URL
   * @param routePath - Ruta con parámetros (/api/users/:id)
   * @param requestPath - URL de la petición (/api/users/123)
   * @returns Parámetros extraídos o null si no coincide
   */
  private matchPath(routePath: string, requestPath: string): RouteParams | null {
    const routeParts = routePath.split('/').filter(part => part.length > 0);
    const requestParts = requestPath.split('/').filter(part => part.length > 0);

    if (routeParts.length !== requestParts.length) {
      return null;
    }

    const params: RouteParams = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];

      if (routePart.startsWith(':')) {
        // Parámetro dinámico
        const paramName = routePart.slice(1);
        params[paramName] = decodeURIComponent(requestPart);
      } else if (routePart !== requestPart) {
        // No coincide
        return null;
      }
    }

    return params;
  }

  /**
   * Obtiene todas las rutas registradas
   * @returns Lista de rutas con información
   */
  getRoutes(): Array<{method: string; path: string; description?: string}> {
    return this.routes.map(route => ({
      method: route.method,
      path: route.path,
      description: route.description
    }));
  }
}
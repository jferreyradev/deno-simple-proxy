/**
 * 🚀 Deno Proxy con Generación de SQL para Oracle
 * 
 * Servidor proxy que convierte JSON a statements INSERT de Oracle
 * Soporta objetos individuales y arrays con múltiples tablas
 * 
 * Uso:
 * 1. Ejecutar: deno run --allow-net main.ts
 * 2. POST a http://localhost:8003 con JSON
 * 3. Recibir SQL de Oracle listo para usar
 */

import { serve } from "https://deno.land/std/http/server.ts";
import { startServer } from "./lib/server.ts";

// 🚀 Iniciar el servidor
if (import.meta.main) {
  startServer(8003, serve);
}
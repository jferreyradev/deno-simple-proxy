/**
 * 🚀 Deno Proxy con Generación de SQL para Oracle
 * 
 * Servidor proxy que convierte JSON a statements INSERT de Oracle
 * Soporta objetos individuales y arrays con múltiples tablas
 * Opcionalmente reenvía el SQL generado a otra API
 * Incluye soporte completo para CORS
 * 
 * Uso:
 * 1. Ejecutar: deno run --allow-net main.ts
 * 2. POST a http://localhost:8003 con JSON
 * 3. Recibir SQL de Oracle listo para usar
 * 4. (Opcional) SQL se reenvía automáticamente a API configurada
 */

import { serve } from "https://deno.land/std/http/server.ts";
import { startServer, setDestinationAPI, setCorsConfig } from "./lib/server.ts";

// 🔒 Configurar CORS (opcional)
// Por defecto permite todos los orígenes (*), pero puedes restringir:

// Ejemplo 1: Solo dominios específicos
// setCorsConfig({
//   origins: ["https://tu-frontend.com", "https://localhost:3000"],
//   credentials: true
// });

// Ejemplo 2: Headers personalizados
// setCorsConfig({
//   headers: ["Content-Type", "Authorization", "X-API-Key"],
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
// });

// 🎯 Configurar API destino (opcional)
// Descomenta y modifica la siguiente línea para reenviar el SQL a otra API:
// setDestinationAPI("https://tu-api.com/endpoint");

// Para testing local, puedes usar:
// setDestinationAPI("http://localhost:8004/sql");

// 🚀 Iniciar el servidor
if (import.meta.main) {
  console.log("🔒 CORS habilitado por defecto para todos los orígenes");
  console.log("🌐 El proxy puede ser usado desde cualquier navegador web");
  startServer(8003, serve);
}
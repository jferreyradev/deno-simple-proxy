/**
 * 🔧 Utilidades para conversión de JSON a SQL Oracle
 */

import type { TableResult } from "./types.ts";

/**
 * Formatea un valor según su tipo para Oracle SQL
 * @param value - Valor a formatear
 * @param fieldName - Nombre del campo (para detectar fechas)
 * @returns Valor formateado para Oracle
 */
export function formatOracleValue(value: unknown, fieldName?: string): string {
  if (value === null || value === undefined) return 'NULL';
  
  // Detectar fechas por nombre de campo o formato
  if (typeof value === 'string' && (
    (typeof fieldName === 'string' && fieldName.toLowerCase().includes('fecha')) ||
    (typeof fieldName === 'string' && fieldName.toLowerCase().includes('date')) ||
    /^\d{1,2}-\d{1,2}-\d{4}$/.test(value) ||  // DD-MM-YYYY
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(value) ||  // YYYY-MM-DD
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)   // DD/MM/YYYY
  )) {
    console.log(`🔄 Convirtiendo fecha: ${fieldName} = ${value}`);
    return convertDateToOracle(value);
  }
  
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? "'Y'" : "'N'";
  if (value instanceof Date) return `TO_DATE('${value.toISOString().slice(0, 19).replace('T', ' ')}', 'YYYY-MM-DD HH24:MI:SS')`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Convierte diferentes formatos de fecha a Oracle TO_DATE
 * @param dateStr - String de fecha en varios formatos
 * @returns Función TO_DATE de Oracle
 */
function convertDateToOracle(dateStr: string): string {
  try {
    let date: Date;
    
    // Detectar formato DD-MM-YYYY (como '25-08-2025')
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Detectar formato YYYY-MM-DD
    else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      date = new Date(dateStr);
    }
    // Detectar formato DD/MM/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Intentar parsear directamente
    else {
      date = new Date(dateStr);
    }
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Fecha inválida: ${dateStr}, usando como string`);
      return `'${dateStr.replace(/'/g, "''")}'`;
    }
    
    // Formatear para Oracle (DD-MM-YYYY)
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `TO_DATE('${day}-${month}-${year}', 'DD-MM-YYYY')`;
    
  } catch (error) {
    console.warn(`⚠️ Error procesando fecha: ${dateStr}, usando como string`);
    return `'${dateStr.replace(/'/g, "''")}'`;
  }
}

/**
 * Infiere el tipo de dato Oracle basado en un valor JSON
 * @param value - Valor a analizar
 * @returns Tipo de dato Oracle
 */
export function inferOracleDataType(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'NUMBER(10)' : 'NUMBER(10,2)';
  } else if (typeof value === 'boolean') {
    return 'CHAR(1)'; // Para Y/N
  } else if (value instanceof Date) {
    return 'DATE';
  } else if (typeof value === 'object') {
    return 'CLOB'; // Para JSON objects
  } else if (typeof value === 'string' && value.length > 100) {
    return 'CLOB';
  }
  return 'VARCHAR2(4000)'; // Default
}

/**
 * Convierte un objeto JSON a statement INSERT de Oracle
 * @param data - Objeto JSON con los datos
 * @param tableName - Nombre de la tabla (por defecto: "DATA_TABLE")
 * @returns Statement INSERT de Oracle
 */
export function jsonToOracleInsert(data: Record<string, unknown>, tableName: string = "DATA_TABLE"): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error("Los datos deben ser un objeto JSON válido");
  }

  // Filtrar el campo tableName si existe (usado para arrays con múltiples tablas)
  const filteredData = { ...data };
  delete filteredData.tableName;

  const keys = Object.keys(filteredData);
  const values = Object.values(filteredData);
  const columns = keys.join(', ');

  // Formatear valores según el tipo de dato para Oracle, pasando el nombre del campo
  const formattedValues = keys.map((key, index) => 
    formatOracleValue(values[index], key)
  ).join(', ');

  return `INSERT INTO ${tableName} (${columns}) VALUES (${formattedValues});`;
}

/**
 * Convierte un objeto JSON a INSERT Oracle y retorna un objeto con metadata
 * @param data - Objeto JSON a convertir
 * @param tableName - Nombre de la tabla
 * @returns Objeto con tableName, insert y metadata
 */
export function jsonToOracleInsertObject(data: Record<string, unknown>, tableName: string = "DATA_TABLE"): { tableName: string; insert: string } {
  const insertStatement = jsonToOracleInsert(data, tableName);
  return {
    tableName,
    insert: insertStatement
  };
}

/**
 * Genera statement CREATE TABLE basado en los tipos de datos JSON
 * @param data - Objeto de ejemplo para inferir tipos
 * @param tableName - Nombre de la tabla
 * @returns Statement CREATE TABLE de Oracle
 */
export function generateCreateTable(data: Record<string, unknown>, tableName: string = "DATA_TABLE"): string {
  const columns = Object.entries(data)
    .filter(([key]) => key !== 'tableName')
    .map(([key, value]) => {
      const dataType = inferOracleDataType(value);
      return `  ${key.toUpperCase()} ${dataType}`;
    })
    .join(',\n');
  
  return `CREATE TABLE ${tableName} (\n${columns}\n);`;
}

/**
 * Genera INSERT ALL (batch insert) para múltiples registros
 * @param items - Array de objetos para la misma tabla
 * @param tableName - Nombre de la tabla
 * @returns Statement INSERT ALL de Oracle
 */
export function generateBatchInsert(items: Array<Record<string, unknown>>, tableName: string): string {
  if (items.length === 0) return '';
  
  const firstItem = { ...items[0] };
  delete firstItem.tableName;
  const columns = Object.keys(firstItem).join(', ');
  
  const values = items.map(item => {
    const filteredItem = { ...item };
    delete filteredItem.tableName;
    const keys = Object.keys(filteredItem);
    const vals = keys.map((key, index) => 
      formatOracleValue(Object.values(filteredItem)[index], key)
    ).join(', ');
    return `  INTO ${tableName} (${columns}) VALUES (${vals})`;
  }).join('\n');

  return `INSERT ALL\n${values}\nSELECT * FROM dual;`;
}

/**
 * Procesa arrays de objetos JSON con campo tableName
 * Agrupa por tabla y genera SQL para cada una
 * @param jsonArray - Array de objetos con campo tableName
 * @returns Array con SQL agrupado por tabla
 */
export function processJsonArray(jsonArray: Array<Record<string, unknown>>): TableResult[] {
  const tableGroups: Record<string, Array<Record<string, unknown>>> = {};

  // Agrupar objetos por tabla
  for (const item of jsonArray) {
    const tableName = (item.tableName as string) || "DATA_TABLE";
    if (!tableGroups[tableName]) {
      tableGroups[tableName] = [];
    }
    tableGroups[tableName].push(item);
  }

  // Generar SQL para cada tabla
  return Object.entries(tableGroups).map(([tableName, items]) => ({
    tableName,
    recordCount: items.length,
    inserts: items.map(item => jsonToOracleInsert(item, tableName)),
    createTable: generateCreateTable(items[0], tableName),
    batchInsert: generateBatchInsert(items, tableName)
  }));
}
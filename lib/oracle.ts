/**
 * 🔧 Utilidades para conversión de JSON a SQL Oracle
 */

import type { TableResult } from "./types.ts";

/**
 * Formatea un valor según su tipo para Oracle SQL
 * @param value - Valor a formatear
 * @returns Valor formateado para Oracle
 */
export function formatOracleValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? "'Y'" : "'N'";
  if (value instanceof Date) return `TO_DATE('${value.toISOString().slice(0, 19).replace('T', ' ')}', 'YYYY-MM-DD HH24:MI:SS')`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
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

  // Formatear valores según el tipo de dato para Oracle
  const formattedValues = values.map(formatOracleValue).join(', ');

  return `INSERT INTO ${tableName} (${columns}) VALUES (${formattedValues});`;
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
    const vals = Object.values(filteredItem).map(formatOracleValue).join(', ');
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
/**
 * Utility functions for RackViz
 */

let idCounter = 0;

export function generateId(prefix = 'rv') {
  return `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
}

export function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function formatBytes(bytes) {
  if (typeof bytes !== 'number') return bytes;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx > 0 ? 1 : 0)} ${units[idx]}`;
}

export function getNestedValue(obj, path) {
  if (!path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let value = obj;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
}

export function applyFormatter(value, formatter) {
  switch (formatter) {
    case 'bytes': return formatBytes(value);
    case 'number': return typeof value === 'number' ? value.toLocaleString() : value;
    case 'percent': return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value;
    case 'upper': return String(value).toUpperCase();
    case 'lower': return String(value).toLowerCase();
    default: return value;
  }
}

export function parseTemplate(template, data) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\$\{([^}]+)\}/g, (match, expr) => {
    try {
      const pipeIdx = expr.indexOf('|');
      if (pipeIdx > -1) {
        const path = expr.slice(0, pipeIdx).trim();
        const formatter = expr.slice(pipeIdx + 1).trim();
        const value = getNestedValue(data, path);
        return applyFormatter(value, formatter);
      }
      return getNestedValue(data, expr.trim()) ?? '';
    } catch { return ''; }
  });
}
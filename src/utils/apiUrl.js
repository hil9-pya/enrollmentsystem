const configuredApiOrigin = import.meta.env?.VITE_API_URL || '';

export function apiUrl(path, origin = configuredApiOrigin) {
  if (!String(path).startsWith('/api/') || !origin) return path;
  return `${String(origin).replace(/\/$/, '')}${path}`;
}

export function apiFetch(path, options) {
  return fetch(apiUrl(path), options);
}

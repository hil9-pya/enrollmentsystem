const configuredApiOrigin = import.meta.env?.VITE_API_URL || '';

export function apiUrl(path, origin = configuredApiOrigin) {
  if (!String(path).startsWith('/api/') || !origin) return path;
  return `${String(origin).replace(/\/$/, '')}${path}`;
}

export async function apiFetch(path, options = {}) {
  const timeoutSignal = AbortSignal.timeout(60_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  try {
    return await fetch(apiUrl(path), { ...options, signal });
  } catch (error) {
    if (error.name === 'TimeoutError') throw new Error('Server took too long to respond. Please try again.');
    throw error;
  }
}

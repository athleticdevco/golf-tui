const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/golf';

// When GOLF_TUI_INSECURE=1, disable TLS certificate verification.
// Handles networks with SSL interception (captive portals, corporate proxies).
let _insecureConfigured = false;

function configureInsecureTls(): void {
  if (_insecureConfigured || process.env.GOLF_TUI_INSECURE !== '1') return;

  // Suppress the NODE_TLS_REJECT_UNAUTHORIZED warning (user explicitly opted in)
  const origEmit = process.emit as (event: string, ...args: any[]) => boolean;
  (process as any).emit = function (event: string, ...args: any[]) {
    if (event === 'warning' && args[0]?.message?.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
      return false;
    }
    return origEmit.apply(process, [event, ...args]);
  };

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  _insecureConfigured = true;
}

/**
 * Wrapper around native fetch that:
 * - Bypasses TLS verification when GOLF_TUI_INSECURE=1 (for networks with SSL interception)
 * - Detects captive portal / proxy HTML responses and throws a clear error
 * - Provides a descriptive error message for TLS certificate failures
 */
export async function safeFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  configureInsecureTls();

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error: any) {
    const msg = error?.cause?.code || error?.message || '';
    if (typeof msg === 'string' && msg.includes('UNABLE_TO_GET_ISSUER_CERT')) {
      throw new Error(
        'TLS certificate error — your network may be intercepting HTTPS connections.\n' +
        'Try: golf --insecure'
      );
    }
    throw error;
  }

  // Detect captive portal / proxy interception returning HTML instead of JSON
  const contentType = response.headers.get('content-type') || '';
  if (response.ok && contentType.includes('text/html')) {
    throw new Error(
      'Received an HTML page instead of JSON — a captive portal or proxy may be intercepting requests.\n' +
      'Try opening a browser and completing any network login, then retry.'
    );
  }

  return response;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number>;
  ttlMs?: number;
  forceRefresh?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  const response = await safeFetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const DEFAULT_CACHE_TTL = 60 * 1000; // 1 minute for live scores

export async function cachedApiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { ttlMs = DEFAULT_CACHE_TTL, forceRefresh = false, ...rest } = options;
  const cacheKey = `${endpoint}${JSON.stringify(rest.params || {})}`;
  const cached = cache.get(cacheKey);

  if (!forceRefresh && cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  const data = await apiRequest<T>(endpoint, rest);
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}

export function clearCache(): void {
  cache.clear();
}

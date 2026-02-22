const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/golf';

// Lazily-initialized undici Agent that skips TLS certificate verification.
// Used when GOLF_TUI_INSECURE=1 for networks with SSL interception.
let _insecureDispatcher: any = null;

async function getInsecureDispatcher(): Promise<any> {
  if (!_insecureDispatcher) {
    // @ts-expect-error undici is bundled with Node 18+ but @types/node doesn't export its types
    const { Agent } = await import('undici');
    _insecureDispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }
  return _insecureDispatcher;
}

/**
 * Wrapper around native fetch that:
 * - Bypasses TLS verification when GOLF_TUI_INSECURE=1 (for networks with SSL interception)
 * - Detects captive portal / proxy HTML responses and throws a clear error
 * - Provides a descriptive error message for TLS certificate failures
 */
export async function safeFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    if (process.env.GOLF_TUI_INSECURE === '1') {
      const dispatcher = await getInsecureDispatcher();
      response = await fetch(url, { ...init, dispatcher } as any);
    } else {
      response = await fetch(url, init);
    }
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

import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Global, mutable scope context: the BusinessActivityProvider keeps these in sync
 * so every fetch automatically carries the caller's identity + active activity.
 * This is the single chokepoint that enforces activity scoping across all modules.
 */
let CURRENT_USER_ID: string | null = null;
let CURRENT_ACTIVITY_ID: string | null = null;

export function setRequestScope(scope: { userId?: string | null; activityId?: string | null }) {
  if ("userId" in scope) CURRENT_USER_ID = scope.userId ?? null;
  if ("activityId" in scope) CURRENT_ACTIVITY_ID = scope.activityId ?? null;
}

export function getRequestScope() {
  return { userId: CURRENT_USER_ID, activityId: CURRENT_ACTIVITY_ID };
}

function buildScopedHeaders(extra?: HeadersInit): HeadersInit {
  const h: Record<string, string> = {};
  if (extra) {
    if (extra instanceof Headers) extra.forEach((v, k) => (h[k] = v));
    else if (Array.isArray(extra)) for (const [k, v] of extra) h[k] = v;
    else Object.assign(h, extra as Record<string, string>);
  }
  if (CURRENT_USER_ID && !h["x-user-id"]) h["x-user-id"] = CURRENT_USER_ID;
  if (CURRENT_ACTIVITY_ID && !h["x-activity-id"]) h["x-activity-id"] = CURRENT_ACTIVITY_ID;
  return h;
}

/** Drop-in fetch wrapper that auto-injects the scope headers on every API call. */
export async function scopedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = buildScopedHeaders(init.headers);
  return fetch(input, { ...init, headers });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  const res = await scopedFetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await scopedFetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

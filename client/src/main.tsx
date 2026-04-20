import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getRequestScope } from "./lib/queryClient";

const PUBLIC_API_PATHS = new Set<string>([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/send-code",
  "/api/auth/verify-code",
  "/api/auth/forgot",
  "/api/portal/login",
  "/api/portal/logout",
  "/api/app-data",
]);

const _origFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  let pathname = "";
  try {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    pathname = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
  } catch {}

  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/portal/") && !PUBLIC_API_PATHS.has(pathname)) {
    const headers = new Headers(init.headers || {});
    if (!headers.has("x-user-id")) {
      const { userId } = getRequestScope();
      let fallback = userId || "";
      if (!fallback) {
        try {
          const raw = localStorage.getItem("user");
          if (raw) fallback = (JSON.parse(raw)?.id as string) || "";
        } catch {}
      }
      if (fallback) headers.set("x-user-id", fallback);
    }
    init = { ...init, headers };
  }
  return _origFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);

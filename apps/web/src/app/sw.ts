import { Serwist } from "serwist";
import type { PrecacheEntry, RuntimeCaching } from "serwist";

declare const self: typeof globalThis & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
  skipWaiting: () => Promise<void>;
};

const sensitivePathPatterns = [
  /^\/casos\/[^/]+\/(?:procesando|resultado|reporte)(?:\/)?$/,
  /^\/api(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/panel(?:\/|$)/,
];

const sensitiveRemoteHostPatterns = [
  /\.functions\.supabase\.co$/,
  /\.supabase\.co$/,
  /oraldiagnostic-ai-service\.hf\.space$/,
];

function isSensitiveRequest(url: URL) {
  if (url.searchParams.has("token")) return true;
  if (url.searchParams.has("download_url")) return true;
  if (url.searchParams.has("upload_url")) return true;

  return (
    sensitivePathPatterns.some((pattern) => pattern.test(url.pathname)) ||
    sensitiveRemoteHostPatterns.some((pattern) => pattern.test(url.hostname))
  );
}

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ request, url, sameOrigin }) =>
      request.method === "GET" &&
      request.mode === "navigate" &&
      sameOrigin &&
      !isSensitiveRequest(url),
    handler: async ({ request }) => {
      try {
        return await fetch(request);
      } catch {
        const cachedFallback = await caches.match("/~offline");
        return (
          cachedFallback ||
          new Response("Sin conexion", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }
    },
  },
  {
    matcher: ({ request, url }) =>
      request.method === "GET" &&
      ["style", "script", "font", "image"].includes(request.destination) &&
      !isSensitiveRequest(url),
    handler: async ({ request }) => {
      const cache = await caches.open("oraldiagnostic-static-v1");
      const cachedResponse = await cache.match(request);

      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok && response.type !== "opaque") {
        await cache.put(request, response.clone());
      }

      return response;
    },
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    navigateFallback: "/~offline",
    navigateFallbackDenylist: [
      /^\/casos\/[^/]+\/(?:procesando|resultado|reporte)(?:\/)?$/,
      /^\/panel(?:\/|$)/,
      /^\/api(?:\/|$)/,
    ],
  },
  runtimeCaching,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

serwist.addEventListeners();

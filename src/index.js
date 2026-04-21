import { onRequestPost, onRequestOptions } from "../functions/api/waitlist.js";

async function proxyPostHog(request, url) {
  const isAsset = url.pathname.startsWith("/ingest/static/");
  const targetHost = isAsset ? "us-assets.i.posthog.com" : "us.i.posthog.com";
  const targetPath = url.pathname.replace(/^\/ingest/, "");
  const target = `https://${targetHost}${targetPath}${url.search}`;
  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "follow",
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/waitlist") {
      if (request.method === "POST") return onRequestPost({ request, env });
      if (request.method === "OPTIONS") return onRequestOptions();
      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname.startsWith("/ingest/")) {
      return proxyPostHog(request, url);
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("text/html") && env.PUBLIC_POSTHOG_KEY) {
      const text = await response.text();
      const configScript =
        `<script>window.__PH_KEY__=${JSON.stringify(env.PUBLIC_POSTHOG_KEY)};` +
        `window.__PH_HOST__=${JSON.stringify(env.PUBLIC_POSTHOG_HOST || "/ingest")};</script>`;
      const modified = text.replace("<head>", "<head>\n" + configScript);
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(modified, { status: response.status, headers });
    }
    return response;
  },
};

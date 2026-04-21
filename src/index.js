import { onRequestPost, onRequestOptions } from "../functions/api/waitlist.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/waitlist") {
      if (request.method === "POST") return onRequestPost({ request, env });
      if (request.method === "OPTIONS") return onRequestOptions();
      return new Response("Method not allowed", { status: 405 });
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("text/html") && env.PUBLIC_POSTHOG_KEY) {
      const text = await response.text();
      const configScript =
        `<script>window.__PH_KEY__=${JSON.stringify(env.PUBLIC_POSTHOG_KEY)};` +
        `window.__PH_HOST__=${JSON.stringify(env.PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com")};</script>`;
      const modified = text.replace("</head>", configScript + "\n</head>");
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(modified, { status: response.status, headers });
    }
    return response;
  },
};

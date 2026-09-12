import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["public/styles.css", "text/css; charset=utf-8"],
  "/auth0.js": [
    "node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js",
    "text/javascript; charset=utf-8",
  ],
};

export function createPortalServer(config) {
  return createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    const pathname = request.url.split("?")[0];
    if (pathname === "/config.json") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        request.method === "HEAD" ? undefined : JSON.stringify(config)
      );
      return;
    }

    const file = files[pathname];
    if (!file) {
      response.writeHead(404).end("Not found");
      return;
    }
    try {
      const body = await readFile(new URL(file[0], import.meta.url));
      response.writeHead(200, { "Content-Type": file[1] });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(500).end("Unable to load portal assets. Run npm ci.");
    }
  });
}

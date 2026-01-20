import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = "http://127.0.0.1:8000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, "../static");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

/** Раздаём /static/* из папки проекта — картинки работают без запущенного backend */
function serveProjectStatic() {
  return {
    name: "serve-project-static",
    configureServer(server) {
      server.middlewares.use("/static", (req, res, next) => {
        const rel = decodeURIComponent((req.url || "/").split("?")[0]);
        const filePath = path.normalize(path.join(staticRoot, rel));

        if (!filePath.startsWith(staticRoot) || !fs.existsSync(filePath)) {
          next();
          return;
        }

        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
          next();
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.statusCode = 200;
        res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

function apiProxy() {
  return {
    target: backend,
    changeOrigin: true,
    bypass(req) {
      if (req.method === "GET" || req.method === "HEAD") {
        return req.url;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), serveProjectStatic()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": backend,
      "/admin/api": backend,
      "/booking/check": backend,
      "/booking/confirm": backend,
      "/orders/create": backend,
      "/logout": backend,
      "/login": apiProxy(),
      "/register": apiProxy(),
    },
  },
});

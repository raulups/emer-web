// MapLibre crea su worker con una URL calculada en tiempo de ejecución que el bundler no ve:
// sin este archivo en `public/` el worker da 404 y el mapa solo pinta los marcadores.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json"));
const out = join(process.cwd(), "public/vendor");
mkdirSync(out, { recursive: true });
copyFileSync(join(dist, "dist/maplibre-gl-worker.mjs"), join(out, "maplibre-gl-worker.mjs"));

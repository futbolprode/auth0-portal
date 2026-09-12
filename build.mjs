import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { readConfig } from "./config.mjs";

const config = readConfig();
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("public", "dist", { recursive: true });
await cp(
  "node_modules/@auth0/auth0-spa-js/dist/auth0-spa-js.production.js",
  "dist/auth0.js",
);
await writeFile("dist/config.json", JSON.stringify(config));

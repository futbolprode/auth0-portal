import { readConfig } from "./config.mjs";
import { createPortalServer } from "./server.mjs";

try {
  const config = readConfig();
  const port = Number(process.env.PORT ?? 5174);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  const server = createPortalServer(config);
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Auth0 demo portal listening on port ${port}`);
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

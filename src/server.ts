import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection during startup:', err);
  process.exit(1);
});

async function main() {
  const env = getEnv();
  try {
    const app = await buildApp();
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info({ port: env.PORT }, "Sync API listening");
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();

import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";

async function main() {
  const env = getEnv();
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info({ port: env.PORT }, "Sync API listening");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

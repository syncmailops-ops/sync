import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection during startup:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception during startup:', err);
  process.exit(1);
});

async function main() {
  try {
    console.log('Starting server...');
    console.log('ENV CHECK:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      HAS_REDIS_URL: !!process.env.REDIS_URL,
      HAS_JWT_PRIVATE: !!process.env.JWT_PRIVATE_KEY,
      HAS_JWT_PUBLIC: !!process.env.JWT_PUBLIC_KEY,
      HAS_JWT_REFRESH: !!process.env.JWT_REFRESH_SECRET,
      HAS_ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
      HAS_ENCRYPTION_IV: !!process.env.ENCRYPTION_IV,
      FRONTEND_URL: process.env.FRONTEND_URL,
    });
    const env = getEnv();
    console.log('Env loaded, building app...');
    const app = await buildApp();
    console.log('App built, listening...');
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Sync API listening on port ${env.PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();

import app from './app.js';
import env from './config/env.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.port, () => {
  console.log(`\n  SAMS API listening on http://localhost:${env.port}`);
  console.log(`  Environment: ${env.nodeEnv}`);
  console.log(`  Health:      http://localhost:${env.port}/health\n`);
});

const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

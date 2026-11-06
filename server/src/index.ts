import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { startScheduler } from './jobs/scheduler.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`CEHACIS API escuchando en ${env.API_URL} (${env.NODE_ENV})`);
  startScheduler();
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const [queueName, redisUrl] = process.argv.slice(2);
if (!queueName || !redisUrl) throw new Error('queue name and Redis URL are required');

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const worker = new Worker(
  queueName,
  async () => {
    process.send?.('active');
    await new Promise(() => undefined);
  },
  { connection, lockDuration: 1_000, stalledInterval: 500, maxStalledCount: 1 },
);

worker.on('error', (error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
});

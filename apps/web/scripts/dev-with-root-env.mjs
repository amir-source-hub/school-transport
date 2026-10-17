import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const rootEnvironment = fileURLToPath(new URL('../../../.env', import.meta.url));
const webPort = process.env.PORT;

try {
  loadEnvFile(rootEnvironment);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

// The root PORT belongs to the API. Keep Next's own default (or an explicitly
// supplied shell value) so loading the shared environment cannot move the web app.
if (webPort === undefined) delete process.env.PORT;
else process.env.PORT = webPort;

// `api` is the Compose-only service hostname. The local web dev server runs on
// the host, so its server components must call the same localhost API URL as
// the browser. This override is intentionally limited to the dev launcher and
// does not alter production or Compose configuration.
if (
  process.env.API_INTERNAL_BASE_URL &&
  /^https?:\/\/api(?::|\/)/i.test(process.env.API_INTERNAL_BASE_URL) &&
  process.env.NEXT_PUBLIC_API_BASE_URL
) {
  process.env.API_INTERNAL_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
}

// Host development must not start serving SSR pages before Nest is listening.
// This launcher is not used by production builds or starts.
if (process.argv.includes('dev')) {
  const apiUrl = new URL(
    process.env.API_INTERNAL_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      'http://127.0.0.1:5000/api/v1',
  );
  if (['localhost', '127.0.0.1', '[::1]'].includes(apiUrl.hostname)) {
    apiUrl.hostname = '127.0.0.1';
    process.env.API_INTERNAL_BASE_URL = apiUrl.toString().replace(/\/$/, '');
    const healthUrl = `${process.env.API_INTERNAL_BASE_URL}/health`;
    console.log('Waiting for the local API before starting Next.js...');
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Nest may still be compiling. */
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!ready)
      throw new Error(
        'Local API did not become ready. Check the API terminal, PostgreSQL and Redis before restarting pnpm dev.',
      );
  }
}
await import('../node_modules/next/dist/bin/next');

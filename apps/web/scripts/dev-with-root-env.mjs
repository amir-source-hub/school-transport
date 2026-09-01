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

await import('../node_modules/next/dist/bin/next');

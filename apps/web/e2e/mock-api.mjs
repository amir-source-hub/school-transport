import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 5100);
const emptyCollections = new Set([
  '/api/v1/students',
  '/api/v1/enrollments',
  '/api/v1/contracts',
  '/api/v1/payments',
  '/api/v1/notifications',
  '/api/v1/admin/enrollments',
  '/api/v1/admin/contracts',
  '/api/v1/admin/payments',
]);

function send(response, status, data) {
  response.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Correlation-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': response.req.headers.origin ?? '*',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(data));
}

const server = createServer((request, response) => {
  response.req = request;
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (request.method === 'OPTIONS') return send(response, 204, null);
  if (url.pathname === '/health') return send(response, 200, { ok: true });
  if (url.pathname === '/api/v1/auth/me') {
    if (request.headers.cookie?.includes('e2e-failure=503')) {
      return send(response, 200, {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'seeded dependency failure' },
      });
    }
    const role = request.headers.cookie?.includes('e2e-role=ADMIN') ? 'ADMIN' : 'PARENT';
    return send(response, 200, { success: true, data: { user: { role } } });
  }
  if (emptyCollections.has(url.pathname)) {
    return send(response, 200, { success: true, data: [] });
  }
  return send(response, 404, {
    success: false,
    error: { code: 'E2E_FIXTURE_MISSING', message: `No E2E fixture for ${url.pathname}` },
  });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`E2E mock API listening on ${port}\n`);
});

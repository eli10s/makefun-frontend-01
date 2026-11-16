// Serves the frontend in app/ for local development, nothing more.
// Usage: `node serve.ts` (http://localhost:8080) or `node serve.ts --port 9000`.
// Node 22, standard library only. Every request is answered from a file
// inside app/; anything that would escape that directory gets a 403, and
// anything missing gets a 404. Not a production server.
import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function pickPort(argv) {
  const at = argv.indexOf('--port');
  const n = at === -1 ? NaN : Number(argv[at + 1]);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : 8080;
}

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
]);

function insideRoot(file) {
  return file === APP_ROOT || file.startsWith(APP_ROOT + sep);
}

const server = createServer((req, res) => {
  let path = '/';
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(APP_ROOT, path));
  if (!insideRoot(file)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let body;
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
    body = readFileSync(file);
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
});

const port = pickPort(process.argv.slice(2));
server.listen(port, '127.0.0.1', () => {
  console.log(`Serving app/ at http://localhost:${port}`);
});

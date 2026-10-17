#!/usr/bin/env node
// A static file server for previewing dist/ (npm run dev) and for tests. No dependencies.
//   node scripts/serve.mjs [folder] [port]

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
  '.xpi': 'application/x-xpinstall',
};

/**
 * Serves `root` on `port` (0 for any free one) on localhost.
 * @param {string} root
 * @param {number} [port]
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
export function serve(root, port = 0) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(path.resolve(root))) {
      response.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        response.writeHead(301, { location: `${url.pathname}/` }).end();
        return;
      }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[/** @type {keyof typeof TYPES} */ (path.extname(file))] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => {
      const address = /** @type {import('node:net').AddressInfo} */ (server.address());
      resolve({
        url: `http://localhost:${address.port}/`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] ?? 'dist');
  const { url } = await serve(root, Number(process.argv[3] ?? 3000));
  console.log(`Serving ${path.relative(process.cwd(), root) || '.'} at ${url}`);
}

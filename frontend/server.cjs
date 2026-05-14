// Minimal static server with SPA fallback, packaging-friendly for a Windows .exe
// Works both as plain node script and when compiled with "pkg" into an .exe

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const isPackaged = typeof process.pkg !== 'undefined';
const baseDir = isPackaged ? path.dirname(process.execPath) : __dirname;
const appDir = __dirname;

const candidateRoots = [
  path.join(baseDir, 'build'),           // Optional external override beside the executable
  path.join(appDir, 'build'),            // Embedded pkg assets / local SvelteKit static build
  path.join(baseDir, 'dist'),            // Vite default or external override
  path.join(appDir, 'dist'),             // Embedded fallback
  path.join(baseDir, 'public'),          // Last-resort external files
  path.join(appDir, 'public')            // Last-resort embedded files
];

const serveRoot = candidateRoots.find((p) => fs.existsSync(p)) || baseDir;
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const mimeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.map': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8'
};

function safeJoin(rootDir, urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0].split('#')[0]);
  const sanitized = decoded.replace(/^\//, '');
  const joined = path.join(rootDir, sanitized);
  if (!joined.startsWith(rootDir)) return rootDir; // path traversal guard
  return joined;
}

function sendFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeByExt[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const headers = { 'Content-Type': contentType };
    if (/(?:\/_app\/|\.([a-f0-9]{8,})\.)/.test(filePath)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }
    res.writeHead(status, headers);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const reqPath = req.url || '/';
  
  // Special handling for /config.json endpoint
  if (reqPath === '/config.json') {
    // Look for config.json in multiple locations:
    // 1. In the base directory (where server.cjs is located)
    // 2. In the serveRoot directory
    const configPaths = [
      path.join(baseDir, 'config.json'), // Editable runtime override beside the executable
      path.join(serveRoot, 'config.json')
    ];
    
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        return sendFile(res, configPath);
      }
    }
    
    // If config.json not found, return 404
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('config.json not found');
    return;
  }
  
  const filePath = safeJoin(serveRoot, reqPath);
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;

    if (stat && stat.isDirectory()) {
      const candidate = path.join(filePath, 'index.html');
      if (fs.existsSync(candidate)) return sendFile(res, candidate);
    }
    if (stat && stat.isFile()) return sendFile(res, filePath);

    const fallback = path.join(serveRoot, 'index.html');
    if (fs.existsSync(fallback)) return sendFile(res, fallback, 200);

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.listen(port, () => {
  const url = `http://localhost:${port}/`;
  console.log(`Serving: ${serveRoot}`);
  console.log(`Listening: ${url}`);

  try {
    if (process.platform === 'win32') {
      // Launch in Edge (lighter than Chrome)
      spawn('cmd', ['/c', 'start', 'msedge', url], { stdio: 'ignore', detached: true });
    }
  } catch {}
});

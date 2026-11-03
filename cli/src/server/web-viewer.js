import http from 'node:http';
import { getViewerHTML } from './viewer-html.js';

export function startViewerServer(graphData, port = 4000) {
  const html = getViewerHTML(graphData);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/api/graph') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(graphData));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`\n🚀 Graphify Code Graph Viewer running at: http://localhost:${port}`);
      console.log(`📊 Total Files: ${graphData.metadata.totalFiles} | Symbols: ${graphData.metadata.totalSymbols} | Edges: ${graphData.metadata.totalEdges}`);
      console.log(`Press Ctrl+C to stop.`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use, trying ${port + 1}...`);
        resolve(startViewerServer(graphData, port + 1));
      } else {
        reject(err);
      }
    });
  });
}

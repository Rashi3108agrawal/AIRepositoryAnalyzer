#!/usr/bin/env node

import path from 'node:path';
import { scanDirectory } from '../src/indexer/scanner.js';
import { parseSourceFile } from '../src/indexer/parser.js';
import { buildCodeGraph, saveGraph, loadGraph } from '../src/indexer/graph-builder.js';
import { QueryEngine } from '../src/analyzer/query-engine.js';
import { startViewerServer } from '../src/server/web-viewer.js';
import { startMcpServer } from '../src/mcp/server.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

const CACHE_DIR = path.resolve('.graphify');

async function getOrBuildGraph(rootDir = '.') {
  let graphData = loadGraph(CACHE_DIR);
  if (!graphData) {
    console.log(`🔍 No existing code graph found. Scanning codebase...`);
    graphData = await runScan(rootDir);
  }
  return graphData;
}

async function runScan(targetDir = '.') {
  const root = path.resolve(targetDir);
  console.log(`\n📦 Scanning codebase at: ${root}`);
  const startTime = Date.now();

  const { files } = scanDirectory(root);
  console.log(`📄 Found ${files.length} supported source files across JS, TS, React, Python, Java, Go, Rust.`);

  console.log(`⚙️  Parsing AST symbols and imports...`);
  const parsed = files.map((f) => parseSourceFile(f));

  console.log(`🕸️  Building Unified Code Graph, PageRank, and Blast Radius...`);
  const graph = buildCodeGraph(parsed, root);

  const savedPath = saveGraph(graph, CACHE_DIR);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Graph built successfully in ${elapsed}s!`);
  console.log(`📊 Total Files:   ${graph.metadata.totalFiles}`);
  console.log(`🏷️  Total Symbols: ${graph.metadata.totalSymbols}`);
  console.log(`🔗 Total Edges:   ${graph.metadata.totalEdges}`);
  console.log(`💾 Cached to:     ${savedPath}`);
  console.log(`\nLanguages breakdown:`, graph.metadata.languages);

  return graph;
}

async function main() {
  switch (command) {
    case 'scan': {
      const targetDir = args[1] || '.';
      await runScan(targetDir);
      break;
    }

    case 'usages': {
      const symbol = args[1];
      if (!symbol) {
        console.error('❌ Usage: graphify-code usages <symbol_name>');
        process.exit(1);
      }
      const graph = await getOrBuildGraph();
      const engine = new QueryEngine(graph);
      const res = engine.findUsages(symbol);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'callers': {
      const symbol = args[1];
      if (!symbol) {
        console.error('❌ Usage: graphify-code callers <symbol_name>');
        process.exit(1);
      }
      const graph = await getOrBuildGraph();
      const engine = new QueryEngine(graph);
      const res = engine.findCallers(symbol);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'blast-radius':
    case 'impact': {
      const target = args[1];
      if (!target) {
        console.error('❌ Usage: graphify-code blast-radius <symbol_name_or_file_path>');
        process.exit(1);
      }
      const graph = await getOrBuildGraph();
      const engine = new QueryEngine(graph);
      const res = engine.getBlastRadius(target);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'relevant-files':
    case 'context': {
      const task = args.slice(1).join(' ');
      if (!task) {
        console.error('❌ Usage: graphify-code relevant-files "<task_description>"');
        process.exit(1);
      }
      const graph = await getOrBuildGraph();
      const engine = new QueryEngine(graph);
      const res = engine.findRelevantFiles(task);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'summary': {
      const target = args[1];
      const graph = await getOrBuildGraph();
      const engine = new QueryEngine(graph);

      if (target) {
        const res = engine.getBlastRadius(target);
        console.log(JSON.stringify(res, null, 2));
      } else {
        const res = engine.getArchitectureSummary();
        console.log(JSON.stringify(res, null, 2));
      }
      break;
    }

    case 'view':
    case 'serve': {
      const portArgIndex = args.indexOf('--port');
      const port = portArgIndex !== -1 ? Number(args[portArgIndex + 1]) || 4000 : 4000;
      const graph = await getOrBuildGraph();
      await startViewerServer(graph, port);
      break;
    }

    case 'mcp': {
      const graph = await getOrBuildGraph();
      await startMcpServer(graph);
      break;
    }

    case 'help':
    default: {
      console.log(`
⬡ GRAPHIFY CODE GRAPH CLI & MCP SERVER

Commands:
  scan [dir]                   Scan repository and build code graph (.graphify/graph.json)
  usages <symbol>              Find where a symbol is defined, exported, imported, and called
  callers <symbol>             Show what calls flow into a symbol (inflows & call hierarchy)
  blast-radius <symbol|file>   What breaks if I change this? Transitive dependents & risk rating
  relevant-files "<task>"      Rank files & symbols most relevant to a prompt (token-efficient!)
  summary [file]               Codebase architecture summary (or specific file summary)
  view [--port 4000]           Launch interactive visual graph in your browser
  mcp                          Run as Model Context Protocol (MCP) server over stdio

Examples:
  npx graphify-code scan
  npx graphify-code relevant-files "fix authentication token expiration error"
  npx graphify-code blast-radius RepoJobService
  npx graphify-code view --port 4000
  npx graphify-code mcp
`);
      break;
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

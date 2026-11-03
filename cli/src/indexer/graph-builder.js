import fs from 'node:fs';
import path from 'node:path';

/**
 * Builds the unified Code Graph, resolves relationships,
 * computes PageRank centrality, and calculates Blast Radius.
 */
export function buildCodeGraph(parsedFiles, rootDir) {
  const nodes = new Map();
  const edges = [];
  const symbolIndex = new Map(); // name -> Set of symbolIds
  const fileMap = new Map(); // relativePath -> fileObject

  // 1. Create File Nodes & register symbols
  parsedFiles.forEach((file) => {
    fileMap.set(file.path, file);

    const fileNodeId = `file:${file.path}`;
    nodes.set(fileNodeId, {
      id: fileNodeId,
      kind: 'file',
      path: file.path,
      name: path.basename(file.path),
      language: file.language,
      linesOfCode: file.linesOfCode,
      sizeBytes: file.sizeBytes,
      isSensitive: file.isSensitive,
      summary: file.summary,
      symbols: [],
      inDegree: 0,
      outDegree: 0,
      centrality: 0,
      blastRadiusCount: 0,
      blastRadiusDepth: 0,
      riskLevel: 'LOW',
    });

    file.symbols.forEach((sym) => {
      const symbolId = `sym:${file.path}:${sym.name}`;
      const symNode = {
        id: symbolId,
        kind: 'symbol',
        name: sym.name,
        shortName: sym.shortName || sym.name,
        symbolType: sym.kind,
        file: file.path,
        line: sym.line,
        signature: sym.signature,
        exported: sym.exported,
        inDegree: 0,
        outDegree: 0,
        centrality: 0,
        blastRadiusCount: 0,
        riskLevel: 'LOW',
      };

      nodes.set(symbolId, symNode);
      nodes.get(fileNodeId).symbols.push(symbolId);

      // Add edge: file defines symbol
      edges.push({
        source: fileNodeId,
        target: symbolId,
        type: 'defines',
      });

      // Index symbol name
      if (!symbolIndex.has(sym.name)) {
        symbolIndex.set(sym.name, new Set());
      }
      symbolIndex.get(sym.name).add(symbolId);

      if (sym.shortName && sym.shortName !== sym.name) {
        if (!symbolIndex.has(sym.shortName)) {
          symbolIndex.set(sym.shortName, new Set());
        }
        symbolIndex.get(sym.shortName).add(symbolId);
      }
    });
  });

  // 2. Resolve Import Edges (File -> File)
  parsedFiles.forEach((file) => {
    const sourceFileId = `file:${file.path}`;
    const currentDir = path.dirname(file.path);

    file.imports.forEach((imp) => {
      // Try resolving relative path import
      let targetPath = null;
      if (imp.source.startsWith('.')) {
        const potentialBase = path.normalize(path.join(currentDir, imp.source)).replace(/\\/g, '/');
        // Match with known files
        for (const knownPath of fileMap.keys()) {
          const withoutExt = knownPath.replace(/\.[^/.]+$/, '');
          if (knownPath === potentialBase || withoutExt === potentialBase || withoutExt === `${potentialBase}/index`) {
            targetPath = knownPath;
            break;
          }
        }
      } else {
        // Try package/symbol matching
        const sourceName = imp.source.split(/[/.]/).pop();
        for (const [knownPath, knownFile] of fileMap.entries()) {
          if (path.basename(knownPath, path.extname(knownPath)) === sourceName || knownFile.exports.some((e) => imp.symbols.includes(e))) {
            targetPath = knownPath;
            break;
          }
        }
      }

      if (targetPath && targetPath !== file.path) {
        edges.push({
          source: sourceFileId,
          target: `file:${targetPath}`,
          type: 'imports',
          symbols: imp.symbols,
        });
      }
    });
  });

  // 3. Resolve Call & Reference Edges (Symbol/File -> Symbol)
  parsedFiles.forEach((file) => {
    const fileId = `file:${file.path}`;

    file.calls.forEach((calledName) => {
      const candidates = symbolIndex.get(calledName);
      if (candidates && candidates.size > 0) {
        for (const targetSymId of candidates) {
          const targetNode = nodes.get(targetSymId);
          if (targetNode && targetNode.file !== file.path) {
            edges.push({
              source: fileId,
              target: targetSymId,
              type: 'calls',
            });
            break; // link primary match
          }
        }
      }
    });
  });

  // 4. Calculate Degree Metrics
  const adjacencyOut = new Map(); // id -> Set of target ids
  const adjacencyIn = new Map(); // id -> Set of source ids

  for (const node of nodes.values()) {
    adjacencyOut.set(node.id, new Set());
    adjacencyIn.set(node.id, new Set());
  }

  edges.forEach((edge) => {
    if (nodes.has(edge.source) && nodes.has(edge.target)) {
      adjacencyOut.get(edge.source).add(edge.target);
      adjacencyIn.get(edge.target).add(edge.source);
    }
  });

  for (const [id, node] of nodes.entries()) {
    node.outDegree = adjacencyOut.get(id)?.size || 0;
    node.inDegree = adjacencyIn.get(id)?.size || 0;
  }

  // 5. PageRank Centrality Algorithm
  computePageRank(nodes, adjacencyOut, adjacencyIn);

  // 6. Transitive Blast Radius & Risk Assessment
  computeBlastRadius(nodes, adjacencyIn);

  const graphData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      rootDir,
      totalFiles: parsedFiles.length,
      totalSymbols: Array.from(nodes.values()).filter((n) => n.kind === 'symbol').length,
      totalEdges: edges.length,
      languages: countLanguages(parsedFiles),
    },
    nodes: Array.from(nodes.values()),
    edges,
  };

  return graphData;
}

/**
 * Computes PageRank centrality to identify architectural hotspots
 */
function computePageRank(nodes, adjacencyOut, adjacencyIn, iterations = 20, damping = 0.85) {
  const n = nodes.size;
  if (n === 0) return;

  let scores = new Map();
  for (const id of nodes.keys()) {
    scores.set(id, 1 / n);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const nextScores = new Map();
    const baseRank = (1 - damping) / n;

    for (const [id] of nodes.entries()) {
      let incomingRank = 0;
      const incomingNodes = adjacencyIn.get(id);

      if (incomingNodes) {
        for (const srcId of incomingNodes) {
          const srcOutDegree = adjacencyOut.get(srcId)?.size || 1;
          incomingRank += (scores.get(srcId) || 0) / srcOutDegree;
        }
      }

      nextScores.set(id, baseRank + damping * incomingRank);
    }
    scores = nextScores;
  }

  // Normalize scores to 0-100 scale
  let maxScore = 0;
  for (const score of scores.values()) {
    if (score > maxScore) maxScore = score;
  }

  for (const [id, node] of nodes.entries()) {
    const raw = scores.get(id) || 0;
    node.centrality = maxScore > 0 ? Math.round((raw / maxScore) * 100) : 0;
  }
}

/**
 * Computes Transitive Blast Radius (upstream dependents impact tree)
 */
function computeBlastRadius(nodes, adjacencyIn) {
  for (const [id, node] of nodes.entries()) {
    const visited = new Set();
    const queue = [{ id, depth: 0 }];
    let maxDepth = 0;

    while (queue.length > 0) {
      const { id: currId, depth } = queue.shift();
      const parents = adjacencyIn.get(currId);

      if (parents) {
        for (const parentId of parents) {
          if (!visited.has(parentId)) {
            visited.add(parentId);
            maxDepth = Math.max(maxDepth, depth + 1);
            queue.push({ id: parentId, depth: depth + 1 });
          }
        }
      }
    }

    node.blastRadiusCount = visited.size;
    node.blastRadiusDepth = maxDepth;

    // Risk classification
    if (node.isSensitive || node.blastRadiusCount >= 10 || node.centrality >= 70) {
      node.riskLevel = 'CRITICAL';
    } else if (node.blastRadiusCount >= 5 || node.centrality >= 40) {
      node.riskLevel = 'HIGH';
    } else if (node.blastRadiusCount >= 2) {
      node.riskLevel = 'MEDIUM';
    } else {
      node.riskLevel = 'LOW';
    }
  }
}

function countLanguages(files) {
  return files.reduce((acc, f) => {
    acc[f.language] = (acc[f.language] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Saves graph to cache directory (.graphify/graph.json)
 */
export function saveGraph(graphData, cacheDir) {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const filePath = path.join(cacheDir, 'graph.json');
  fs.writeFileSync(filePath, JSON.stringify(graphData, null, 2), 'utf-8');
  return filePath;
}

/**
 * Loads graph from cache directory
 */
export function loadGraph(cacheDir) {
  const filePath = path.join(cacheDir, 'graph.json');
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

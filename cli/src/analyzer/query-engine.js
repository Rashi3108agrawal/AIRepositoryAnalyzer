/**
 * Fast Codebase Query Engine
 * Answers code structure, blast radius, callers, usages, and relevant file queries
 * with minimal token output.
 */

export class QueryEngine {
  constructor(graphData) {
    this.graph = graphData;
    this.nodes = new Map(graphData.nodes.map((n) => [n.id, n]));
    this.edges = graphData.edges;

    // Index mappings
    this.inEdges = new Map(); // targetId -> list of edges
    this.outEdges = new Map(); // sourceId -> list of edges
    this.symbolNameMap = new Map(); // lowerSymbolName -> list of nodes
    this.filePathMap = new Map(); // lowerFilePath -> node

    for (const node of this.nodes.values()) {
      if (node.kind === 'file') {
        this.filePathMap.set(node.path.toLowerCase(), node);
      } else if (node.kind === 'symbol') {
        const lower = node.name.toLowerCase();
        if (!this.symbolNameMap.has(lower)) {
          this.symbolNameMap.set(lower, []);
        }
        this.symbolNameMap.get(lower).push(node);

        if (node.shortName && node.shortName !== node.name) {
          const lowerShort = node.shortName.toLowerCase();
          if (!this.symbolNameMap.has(lowerShort)) {
            this.symbolNameMap.set(lowerShort, []);
          }
          this.symbolNameMap.get(lowerShort).push(node);
        }
      }
    }

    this.edges.forEach((edge) => {
      if (!this.outEdges.has(edge.source)) this.outEdges.set(edge.source, []);
      if (!this.inEdges.has(edge.target)) this.inEdges.set(edge.target, []);

      this.outEdges.get(edge.source).push(edge);
      this.inEdges.get(edge.target).push(edge);
    });
  }

  /**
   * Find where a symbol is defined, exported, imported, and called across the repo
   */
  findUsages(symbolName) {
    const targetNodes = this.resolveSymbolNodes(symbolName);
    if (targetNodes.length === 0) {
      return {
        query: symbolName,
        found: false,
        message: `No symbol matching '${symbolName}' found in code graph.`,
      };
    }

    const results = targetNodes.map((target) => {
      const incomingEdges = this.inEdges.get(target.id) || [];
      const definitions = [];
      const callers = [];
      const references = [];

      incomingEdges.forEach((edge) => {
        const sourceNode = this.nodes.get(edge.source);
        if (!sourceNode) return;

        if (edge.type === 'defines') {
          definitions.push({ file: sourceNode.path, line: target.line, signature: target.signature });
        } else if (edge.type === 'calls') {
          callers.push({
            from: sourceNode.name,
            kind: sourceNode.kind,
            file: sourceNode.path || sourceNode.file,
          });
        } else {
          references.push({ from: sourceNode.name, file: sourceNode.path || sourceNode.file });
        }
      });

      return {
        symbol: target.name,
        type: target.symbolType,
        definedIn: target.file,
        line: target.line,
        signature: target.signature,
        isExported: target.exported,
        centrality: target.centrality,
        blastRadius: target.blastRadiusCount,
        riskLevel: target.riskLevel,
        directCallersCount: callers.length,
        callers,
        references,
      };
    });

    return {
      query: symbolName,
      found: true,
      matches: results,
    };
  }

  /**
   * Trace call inflows (who calls this symbol, both direct and upstream callers)
   */
  findCallers(symbolName, maxDepth = 3) {
    const targetNodes = this.resolveSymbolNodes(symbolName);
    if (targetNodes.length === 0) {
      return { query: symbolName, found: false, callers: [] };
    }

    const results = targetNodes.map((target) => {
      const callTree = [];
      const visited = new Set();

      const traverse = (currentId, depth) => {
        if (depth > maxDepth || visited.has(currentId)) return;
        visited.add(currentId);

        const incoming = this.inEdges.get(currentId) || [];
        for (const edge of incoming) {
          if (edge.type === 'calls' || edge.type === 'imports') {
            const srcNode = this.nodes.get(edge.source);
            if (srcNode) {
              callTree.push({
                caller: srcNode.name,
                kind: srcNode.kind,
                file: srcNode.path || srcNode.file,
                depth,
                relationship: edge.type,
              });
              traverse(edge.source, depth + 1);
            }
          }
        }
      };

      traverse(target.id, 1);

      return {
        target: target.name,
        file: target.file,
        line: target.line,
        totalUpstreamCallers: callTree.length,
        callHierarchy: callTree,
      };
    });

    return { query: symbolName, found: true, results };
  }

  /**
   * Trace call outflows (what does this symbol call)
   */
  findCallees(symbolName) {
    const targetNodes = this.resolveSymbolNodes(symbolName);
    if (targetNodes.length === 0) {
      return { query: symbolName, found: false, callees: [] };
    }

    const results = targetNodes.map((target) => {
      const outgoing = this.outEdges.get(target.id) || [];
      const callees = outgoing
        .filter((e) => e.type === 'calls')
        .map((e) => {
          const targetNode = this.nodes.get(e.target);
          return targetNode
            ? { name: targetNode.name, file: targetNode.file, type: targetNode.symbolType }
            : null;
        })
        .filter(Boolean);

      return {
        symbol: target.name,
        file: target.file,
        calleesCount: callees.length,
        callees,
      };
    });

    return { query: symbolName, found: true, results };
  }

  /**
   * Blast Radius: What breaks if I change this file or symbol?
   */
  getBlastRadius(targetQuery) {
    let targetNode = this.resolveNode(targetQuery);

    if (!targetNode) {
      return {
        target: targetQuery,
        found: false,
        message: `Node or file '${targetQuery}' not found in code graph.`,
      };
    }

    const affectedFiles = new Set();
    const affectedSymbols = new Set();
    const impactChain = [];
    const visited = new Set();

    const queue = [{ id: targetNode.id, depth: 0, via: 'target' }];

    while (queue.length > 0) {
      const { id: currId, depth, via } = queue.shift();
      if (visited.has(currId)) continue;
      visited.add(currId);

      const currNode = this.nodes.get(currId);
      if (currNode && currId !== targetNode.id) {
        if (currNode.kind === 'file') {
          affectedFiles.add(currNode.path);
        } else if (currNode.kind === 'symbol') {
          affectedSymbols.add(`${currNode.name} (${currNode.file})`);
          affectedFiles.add(currNode.file);
        }

        impactChain.push({
          name: currNode.name,
          kind: currNode.kind,
          file: currNode.path || currNode.file,
          depth,
          via,
          risk: currNode.riskLevel,
        });
      }

      const incoming = this.inEdges.get(currId) || [];
      for (const edge of incoming) {
        if (!visited.has(edge.source)) {
          queue.push({ id: edge.source, depth: depth + 1, via: edge.type });
        }
      }
    }

    const isHighRisk =
      targetNode.isSensitive ||
      affectedFiles.size >= 8 ||
      targetNode.centrality >= 50;

    return {
      target: targetNode.name,
      kind: targetNode.kind,
      file: targetNode.path || targetNode.file,
      riskLevel: targetNode.riskLevel,
      centralityScore: targetNode.centrality,
      blastRadiusSummary: {
        totalAffectedFiles: affectedFiles.size,
        totalAffectedSymbols: affectedSymbols.size,
        maxImpactDepth: targetNode.blastRadiusDepth,
        criticalBreakRisk: isHighRisk,
        securitySensitive: Boolean(targetNode.isSensitive),
      },
      affectedFileList: Array.from(affectedFiles),
      topImpactedDependents: impactChain.slice(0, 10),
      recommendation: isHighRisk
        ? '⚠️ High blast radius. Run comprehensive regression tests across all affected files.'
        : '✅ Low blast radius. Changes are largely isolated.',
    };
  }

  /**
   * Find most relevant files for an AI task prompt using keyword relevance,
   * symbol matching, and architectural centrality
   */
  findRelevantFiles(taskDescription, topN = 6) {
    if (!taskDescription) {
      return { task: '', relevantFiles: [] };
    }

    const queryTokens = taskDescription
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scoredFiles = [];

    for (const node of this.nodes.values()) {
      if (node.kind !== 'file') continue;

      let score = 0;
      const pathLower = node.path.toLowerCase();
      const summaryLower = (node.summary || '').toLowerCase();

      // Keyword matching in file path
      queryTokens.forEach((token) => {
        if (pathLower.includes(token)) score += 15;
        if (summaryLower.includes(token)) score += 8;
      });

      // Symbol matching inside file
      const fileSymbols = (node.symbols || []).map((id) => this.nodes.get(id)).filter(Boolean);
      fileSymbols.forEach((sym) => {
        const symNameLower = sym.name.toLowerCase();
        queryTokens.forEach((token) => {
          if (symNameLower === token) score += 25;
          else if (symNameLower.includes(token)) score += 10;
        });
      });

      // Factor in architectural centrality (PageRank) as tie-breaker
      score += (node.centrality || 0) * 0.15;

      // Penalize test files slightly unless specifically asked
      if (pathLower.includes('test') && !taskDescription.toLowerCase().includes('test')) {
        score *= 0.5;
      }

      if (score > 0) {
        scoredFiles.push({
          path: node.path,
          language: node.language,
          relevanceScore: Math.round(score),
          centrality: node.centrality,
          riskLevel: node.riskLevel,
          summary: node.summary,
          keySymbols: fileSymbols.slice(0, 4).map((s) => s.name),
        });
      }
    }

    scoredFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      task: taskDescription,
      totalMatched: scoredFiles.length,
      relevantFiles: scoredFiles.slice(0, topN),
    };
  }

  /**
   * High-level architectural overview: central hub files, entry points, hotspots
   */
  getArchitectureSummary() {
    const fileNodes = Array.from(this.nodes.values()).filter((n) => n.kind === 'file');
    const symbolNodes = Array.from(this.nodes.values()).filter((n) => n.kind === 'symbol');

    // Central hub files (top PageRank)
    const centralHubs = [...fileNodes]
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, 8)
      .map((f) => ({
        path: f.path,
        language: f.language,
        centrality: f.centrality,
        blastRadius: f.blastRadiusCount,
        riskLevel: f.riskLevel,
        summary: f.summary,
      }));

    // Security sensitive files
    const sensitiveFiles = fileNodes
      .filter((f) => f.isSensitive)
      .map((f) => ({ path: f.path, riskLevel: f.riskLevel, summary: f.summary }));

    // High blast radius hotspots
    const hotspots = [...fileNodes]
      .sort((a, b) => b.blastRadiusCount - a.blastRadiusCount)
      .slice(0, 6)
      .map((f) => ({
        path: f.path,
        blastRadiusCount: f.blastRadiusCount,
        riskLevel: f.riskLevel,
      }));

    return {
      metadata: this.graph.metadata,
      totalFiles: fileNodes.length,
      totalSymbols: symbolNodes.length,
      totalEdges: this.edges.length,
      languages: this.graph.metadata.languages,
      topArchitecturalHubs: centralHubs,
      securitySensitiveSurfaces: sensitiveFiles,
      blastRadiusHotspots: hotspots,
    };
  }

  /**
   * Helper: Resolve symbol node(s) by name or partial path
   */
  resolveSymbolNodes(query) {
    const lower = query.toLowerCase().trim();
    if (this.symbolNameMap.has(lower)) {
      return this.symbolNameMap.get(lower);
    }

    // Partial search
    const matches = [];
    for (const [name, list] of this.symbolNameMap.entries()) {
      if (name.includes(lower)) {
        matches.push(...list);
      }
    }
    return matches;
  }

  /**
   * Helper: Resolve any node (file or symbol)
   */
  resolveNode(query) {
    const normalized = query.replace(/\\/g, '/').toLowerCase().trim();

    if (this.filePathMap.has(normalized)) {
      return this.filePathMap.get(normalized);
    }

    // Try finding by symbol
    const syms = this.resolveSymbolNodes(query);
    if (syms.length > 0) return syms[0];

    // Try finding by path suffix
    for (const [p, node] of this.filePathMap.entries()) {
      if (p.endsWith(normalized) || p.includes(normalized)) {
        return node;
      }
    }

    return null;
  }
}

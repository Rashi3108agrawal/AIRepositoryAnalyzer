/**
 * Standalone, rich dark-mode interactive browser code graph viewer
 * Zero external client-side build tools required; runs in any modern browser.
 */
export function getViewerHTML(graphData) {
  const jsonGraph = JSON.stringify(graphData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Graphify Code Graph | Visual Codebase Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    :root {
      --bg: #0b0f17;
      --card-bg: rgba(18, 24, 38, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.4);
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
      --cyan: #06b6d4;
      --text: #f3f4f6;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', -apple-system, sans-serif;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      height: 60px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      background: rgba(11, 15, 23, 0.95);
      backdrop-filter: blur(12px);
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }

    .badge {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .stats-bar {
      display: flex;
      gap: 16px;
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .stat-val { color: var(--text); font-weight: 600; font-family: 'Fira Code', monospace; }

    .search-box {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 6px 14px;
      width: 320px;
    }
    .search-box input {
      background: transparent;
      border: none;
      color: var(--text);
      outline: none;
      width: 100%;
      font-size: 0.85rem;
    }

    .layout {
      flex: 1;
      display: flex;
      position: relative;
      height: calc(100vh - 60px);
    }

    #network {
      flex: 1;
      height: 100%;
      background: radial-gradient(circle at 50% 50%, #111827 0%, #080c14 100%);
    }

    /* Side Panel */
    .sidebar {
      width: 420px;
      height: 100%;
      background: var(--card-bg);
      border-left: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      z-index: 5;
      overflow-y: auto;
    }

    .panel-header {
      padding: 20px;
      border-bottom: 1px solid var(--card-border);
    }
    .panel-title {
      font-size: 1.1rem;
      font-weight: 600;
      word-break: break-all;
    }
    .panel-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
      font-family: 'Fira Code', monospace;
    }

    .panel-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .metric-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .metric-num {
      font-size: 1.2rem;
      font-weight: 700;
      font-family: 'Fira Code', monospace;
      color: var(--accent);
    }
    .metric-lbl {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 2px;
    }

    .risk-tag {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .risk-LOW { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .risk-MEDIUM { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .risk-HIGH { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .risk-CRITICAL { background: rgba(239, 68, 68, 0.35); color: #ff4d4d; border: 1px solid #ef4444; }

    .section-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .list-item {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
      font-size: 0.8rem;
      font-family: 'Fira Code', monospace;
      margin-bottom: 6px;
      border-left: 3px solid var(--accent);
      cursor: pointer;
    }
    .list-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    /* Controls Overlay */
    .controls-overlay {
      position: absolute;
      top: 16px;
      left: 16px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      gap: 10px;
      z-index: 5;
      backdrop-filter: blur(12px);
    }
    .btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover { background: var(--accent); border-color: var(--accent); }
    .btn.active { background: var(--accent); }

    .legend {
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 8px 14px;
      display: flex;
      gap: 14px;
      font-size: 0.75rem;
      color: var(--text-muted);
      backdrop-filter: blur(12px);
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>⬡ Graphify Code Graph</span>
      <span class="badge">MCP Ready</span>
    </div>
    <div class="stats-bar">
      <div>Files: <span class="stat-val" id="totalFiles">0</span></div>
      <div>Symbols: <span class="stat-val" id="totalSymbols">0</span></div>
      <div>Edges: <span class="stat-val" id="totalEdges">0</span></div>
    </div>
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search files, symbols, endpoints...">
    </div>
  </header>

  <div class="layout">
    <div class="controls-overlay">
      <button class="btn active" id="btnAll" onclick="setFilter('all')">All Nodes</button>
      <button class="btn" id="btnFiles" onclick="setFilter('files')">Files Only</button>
      <button class="btn" id="btnHotspots" onclick="setFilter('hotspots')">Blast Hotspots</button>
      <button class="btn" onclick="network.fit({ animation: true })">Reset View</button>
    </div>

    <div id="network"></div>

    <div class="legend">
      <div class="legend-item"><span class="dot" style="background:#3b82f6;"></span> File</div>
      <div class="legend-item"><span class="dot" style="background:#10b981;"></span> Low Risk</div>
      <div class="legend-item"><span class="dot" style="background:#f59e0b;"></span> Medium Risk</div>
      <div class="legend-item"><span class="dot" style="background:#ef4444;"></span> High / Critical</div>
      <div class="legend-item"><span class="dot" style="background:#06b6d4;"></span> Upstream Caller</div>
    </div>

    <div class="sidebar" id="sidebar">
      <div class="panel-header">
        <div id="panelRiskTag" class="risk-tag risk-LOW" style="margin-bottom: 8px;">SELECT A NODE</div>
        <h2 class="panel-title" id="panelTitle">Codebase Overview</h2>
        <div class="panel-subtitle" id="panelSubtitle">Click on any file or symbol in the graph to inspect</div>
      </div>
      <div class="panel-body" id="panelContent">
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-num" id="metricCentrality">-</div>
            <div class="metric-lbl">PageRank</div>
          </div>
          <div class="metric-card">
            <div class="metric-num" id="metricBlast">-</div>
            <div class="metric-lbl">Blast Radius</div>
          </div>
          <div class="metric-card">
            <div class="metric-num" id="metricLines">-</div>
            <div class="metric-lbl">LOC</div>
          </div>
        </div>

        <div>
          <div class="section-title">Summary</div>
          <p id="panelSummary" style="font-size: 0.85rem; line-height: 1.5; color: var(--text-muted);">-</p>
        </div>

        <div>
          <div class="section-title">Key Contained Symbols</div>
          <div id="panelSymbols"><p style="font-size:0.8rem; color:var(--text-muted);">None</p></div>
        </div>

        <div>
          <div class="section-title">Direct Inflow Callers / Importers</div>
          <div id="panelInflows"><p style="font-size:0.8rem; color:var(--text-muted);">None</p></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const graphData = ${jsonGraph};

    document.getElementById('totalFiles').textContent = graphData.metadata.totalFiles;
    document.getElementById('totalSymbols').textContent = graphData.metadata.totalSymbols;
    document.getElementById('totalEdges').textContent = graphData.metadata.totalEdges;

    const colorByRisk = {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      CRITICAL: '#ef4444'
    };

    // Prepare Vis Network nodes & edges
    const visNodes = graphData.nodes.map(n => {
      const isFile = n.kind === 'file';
      const size = Math.max(12, Math.min(35, isFile ? (n.centrality / 3) + 14 : 10));

      return {
        id: n.id,
        label: isFile ? n.name : n.name.split('.').pop(),
        title: \`\${n.name} (\${n.kind})\`,
        shape: isFile ? 'dot' : 'diamond',
        size: size,
        color: {
          background: colorByRisk[n.riskLevel] || '#3b82f6',
          border: n.isSensitive ? '#ef4444' : '#ffffff',
          highlight: { background: '#38bdf8', border: '#ffffff' }
        },
        font: { color: '#f3f4f6', size: isFile ? 12 : 9, face: 'Fira Code' },
        raw: n
      };
    });

    const visEdges = graphData.edges.map(e => ({
      from: e.source,
      to: e.target,
      arrows: 'to',
      color: { color: 'rgba(255,255,255,0.12)', highlight: '#38bdf8' },
      smooth: { type: 'continuous' }
    }));

    const container = document.getElementById('network');
    const data = {
      nodes: new vis.DataSet(visNodes),
      edges: new vis.DataSet(visEdges)
    };

    const options = {
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 80,
          springConstant: 0.08,
          damping: 0.4
        },
        stabilization: { iterations: 120 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true
      }
    };

    const network = new vis.Network(container, data, options);

    // Click handler for node inspection
    network.on('click', function(params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (node) showDetails(node);
      }
    });

    function showDetails(node) {
      document.getElementById('panelTitle').textContent = node.name;
      document.getElementById('panelSubtitle').textContent = node.path || node.file || '';

      const riskTag = document.getElementById('panelRiskTag');
      riskTag.className = \`risk-tag risk-\${node.riskLevel}\`;
      riskTag.textContent = \`\${node.riskLevel} RISK\`;

      document.getElementById('metricCentrality').textContent = node.centrality || '0';
      document.getElementById('metricBlast').textContent = node.blastRadiusCount || '0';
      document.getElementById('metricLines').textContent = node.linesOfCode || '-';

      document.getElementById('panelSummary').textContent = node.summary || (node.signature ? \`Signature: \${node.signature}\` : 'No summary available.');

      // Inflows
      const incomingEdges = graphData.edges.filter(e => e.target === node.id);
      const inflowsEl = document.getElementById('panelInflows');
      inflowsEl.innerHTML = '';
      if (incomingEdges.length === 0) {
        inflowsEl.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">No incoming callers (entry point or leaf)</p>';
      } else {
        incomingEdges.slice(0, 10).forEach(e => {
          const src = graphData.nodes.find(n => n.id === e.source);
          if (src) {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.textContent = \`[\${e.type}] \${src.name}\`;
            div.onclick = () => {
              network.selectNodes([src.id]);
              network.focus(src.id, { animation: true, scale: 1.2 });
              showDetails(src);
            };
            inflowsEl.appendChild(div);
          }
        });
      }

      // Symbols if file
      const symbolsEl = document.getElementById('panelSymbols');
      symbolsEl.innerHTML = '';
      if (node.symbols && node.symbols.length > 0) {
        node.symbols.slice(0, 12).forEach(symId => {
          const sym = graphData.nodes.find(n => n.id === symId);
          if (sym) {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.textContent = \`\${sym.symbolType || 'symbol'}: \${sym.name}\`;
            div.onclick = () => {
              network.selectNodes([sym.id]);
              network.focus(sym.id, { animation: true, scale: 1.2 });
              showDetails(sym);
            };
            symbolsEl.appendChild(div);
          }
        });
      } else {
        symbolsEl.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">None</p>';
      }
    }

    // Search filter
    document.getElementById('searchInput').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) return;

      const found = graphData.nodes.find(n => n.name.toLowerCase().includes(q));
      if (found) {
        network.selectNodes([found.id]);
        network.focus(found.id, { animation: true, scale: 1.3 });
        showDetails(found);
      }
    });

    // Filtering
    function setFilter(type) {
      document.querySelectorAll('.controls-overlay .btn').forEach(b => b.classList.remove('active'));
      if (type === 'all') {
        document.getElementById('btnAll').classList.add('active');
        data.nodes.update(visNodes);
      } else if (type === 'files') {
        document.getElementById('btnFiles').classList.add('active');
        const fileIds = new Set(graphData.nodes.filter(n => n.kind === 'file').map(n => n.id));
        const filtered = visNodes.filter(n => fileIds.has(n.id));
        data.nodes.clear();
        data.nodes.add(filtered);
      } else if (type === 'hotspots') {
        document.getElementById('btnHotspots').classList.add('active');
        const hotspotIds = new Set(graphData.nodes.filter(n => n.blastRadiusCount >= 3 || n.riskLevel === 'CRITICAL' || n.riskLevel === 'HIGH').map(n => n.id));
        const filtered = visNodes.filter(n => hotspotIds.has(n.id));
        data.nodes.clear();
        data.nodes.add(filtered);
      }
    }
  </script>
</body>
</html>`;
}

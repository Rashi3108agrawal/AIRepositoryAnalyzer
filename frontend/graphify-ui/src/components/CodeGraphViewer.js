import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import GitViewer from "./GitViewer";
import SearchBar from "./SearchBar";
import DependencyViewer from "./DependencyViewer";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export default function CodeGraphViewer() {
  const [activeTab, setActiveTab] = useState('graph');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Graph state
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // all | files | hotspots
  const [searchTerm, setSearchTerm] = useState('');

  // Tool inputs
  const [blastQuery, setBlastQuery] = useState('RepoJob');
  const [blastResult, setBlastResult] = useState(null);

  const [symbolQuery, setSymbolQuery] = useState('createJob');
  const [symbolResult, setSymbolResult] = useState(null);

  const [taskQuery, setTaskQuery] = useState('fix analysis error and poll job status');
  const [taskResult, setTaskResult] = useState(null);

  const canvasRef = useRef(null);

  // 1. Fetch graph data from backend
  useEffect(() => {
    async function loadGraph() {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/code-graph`);
        if (res.data && res.data.nodes) {
          setGraphData(res.data);
          // Set initial selection to most central file
          const topNode = [...res.data.nodes].sort((a, b) => (b.centrality || 0) - (a.centrality || 0))[0];
          setSelectedNode(topNode || null);
        }
      } catch (err) {
        console.warn('Could not load code graph from API:', err);
        setError('Code graph cache is being initialized or backend is starting up.');
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, []);

  // Filter nodes for the canvas
  const visibleNodes = useMemo(() => {
    if (!graphData) return [];
    let list = graphData.nodes;

    if (filterMode === 'files') {
      list = list.filter((n) => n.kind === 'file');
    } else if (filterMode === 'hotspots') {
      list = list.filter((n) => n.blastRadiusCount >= 3 || n.riskLevel === 'CRITICAL' || n.riskLevel === 'HIGH');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((n) => n.name.toLowerCase().includes(q) || (n.path && n.path.toLowerCase().includes(q)));
    }

    return list;
  }, [graphData, filterMode, searchTerm]);

  // 2. Interactive Canvas Force Simulation
  useEffect(() => {
    if (!canvasRef.current || visibleNodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Simulation nodes with physics coordinates
    const width = canvas.width;
    const height = canvas.height;

    const simNodes = visibleNodes.map((n, i) => ({
      ...n,
      x: width / 2 + Math.cos((i / visibleNodes.length) * 2 * Math.PI) * (width * 0.35) * (0.8 + Math.random() * 0.4),
      y: height / 2 + Math.sin((i / visibleNodes.length) * 2 * Math.PI) * (height * 0.35) * (0.8 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: Math.max(8, Math.min(24, n.kind === 'file' ? (n.centrality || 0) / 4 + 10 : 8)),
    }));

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    // Edges linking visible nodes
    const visibleEdges = (graphData?.edges || [])
      .map((e) => ({
        source: nodeMap.get(e.source),
        target: nodeMap.get(e.target),
        type: e.type,
      }))
      .filter((e) => e.source && e.target);

    // Run simple force relaxation
    function tick() {
      // Repulsion between nodes
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;

          if (dist < 120) {
            const force = (120 - dist) / 120 * 0.3;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.x -= fx;
            a.y -= fy;
            b.x += fx;
            b.y += fy;
          }
        }
      }

      // Edge spring attraction
      for (const e of visibleEdges) {
        const dx = e.target.x - e.source.x;
        const dy = e.target.y - e.source.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = (dist - 80) * 0.002;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        e.source.x += fx;
        e.source.y += fy;
        e.target.x -= fx;
        e.target.y -= fy;
      }

      // Center gravity
      for (const n of simNodes) {
        n.x += (width / 2 - n.x) * 0.01;
        n.y += (height / 2 - n.y) * 0.01;

        // Boundaries
        n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
      }

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw Edges
      for (const e of visibleEdges) {
        const isHighlight =
          selectedNode && (e.source.id === selectedNode.id || e.target.id === selectedNode.id);

        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        ctx.strokeStyle = isHighlight ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isHighlight ? 2 : 1;
        ctx.stroke();
      }

      // Draw Nodes
      for (const n of simNodes) {
        const isSelected = selectedNode && selectedNode.id === n.id;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

        // Fill color by risk or type
        if (n.riskLevel === 'CRITICAL' || n.riskLevel === 'HIGH') {
          ctx.fillStyle = isSelected ? '#ff4d4d' : '#ef4444';
        } else if (n.riskLevel === 'MEDIUM') {
          ctx.fillStyle = isSelected ? '#fbbf24' : '#f59e0b';
        } else {
          ctx.fillStyle = isSelected ? '#60a5fa' : '#3b82f6';
        }

        ctx.fill();

        if (isSelected || n.isSensitive) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = n.isSensitive ? '#ef4444' : '#ffffff';
          ctx.stroke();
        }

        // Label
        ctx.font = '10px "Fira Code", monospace';
        ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + n.radius + 12);
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    tick();

    // Canvas click to select node
    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const n of simNodes) {
        const dist = Math.hypot(n.x - clickX, n.y - clickY);
        if (dist <= n.radius + 5) {
          setSelectedNode(n);
          break;
        }
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [visibleNodes, selectedNode, graphData]);

  // Execute blast radius query
  const runBlastQuery = () => {
    if (!graphData || !blastQuery.trim()) return;
    const q = blastQuery.toLowerCase().trim();

    const targetNode = graphData.nodes.find(
      (n) => n.name.toLowerCase() === q || (n.path && n.path.toLowerCase().includes(q))
    );

    if (!targetNode) {
      setBlastResult({ found: false, message: `Node '${blastQuery}' not found.` });
      return;
    }

    // Direct and indirect incoming callers
    const affected = new Set();
    const queue = [targetNode.id];
    const visited = new Set();

    while (queue.length > 0) {
      const curr = queue.shift();
      if (visited.has(curr)) continue;
      visited.add(curr);

      const inEdges = graphData.edges.filter((e) => e.target === curr);
      for (const edge of inEdges) {
        const srcNode = graphData.nodes.find((n) => n.id === edge.source);
        if (srcNode) {
          affected.add(srcNode.path || srcNode.file || srcNode.name);
          if (!visited.has(edge.source)) queue.push(edge.source);
        }
      }
    }

    setBlastResult({
      found: true,
      target: targetNode.name,
      file: targetNode.path || targetNode.file,
      riskLevel: targetNode.riskLevel,
      centrality: targetNode.centrality,
      totalAffected: affected.size,
      affectedFiles: Array.from(affected),
      recommendation:
        targetNode.riskLevel === 'CRITICAL' || affected.size > 5
          ? '⚠️ High blast radius. Modifying this symbol requires regression testing across dependent modules.'
          : '✅ Low blast radius. Changes are safe and isolated.',
    });
  };

  // Execute symbol search query
  const runSymbolQuery = () => {
    if (!graphData || !symbolQuery.trim()) return;
    const q = symbolQuery.toLowerCase().trim();

    const matches = graphData.nodes.filter(
      (n) => n.kind === 'symbol' && n.name.toLowerCase().includes(q)
    );

    const detailed = matches.map((m) => {
      const callers = graphData.edges
        .filter((e) => e.target === m.id && e.type === 'calls')
        .map((e) => {
          const src = graphData.nodes.find((n) => n.id === e.source);
          return src ? src.name : null;
        })
        .filter(Boolean);

      return {
        name: m.name,
        file: m.file,
        line: m.line,
        signature: m.signature,
        exported: m.exported,
        riskLevel: m.riskLevel,
        callers,
      };
    });

    setSymbolResult(detailed);
  };

  // Execute AI task context ranking
  const runTaskQuery = () => {
    if (!graphData || !taskQuery.trim()) return;
    const tokens = taskQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const fileNodes = graphData.nodes.filter((n) => n.kind === 'file');
    const scored = fileNodes.map((f) => {
      let score = 0;
      const pathLower = f.path.toLowerCase();
      const summaryLower = (f.summary || '').toLowerCase();

      tokens.forEach((t) => {
        if (pathLower.includes(t)) score += 20;
        if (summaryLower.includes(t)) score += 10;
      });

      score += (f.centrality || 0) * 0.15;

      return {
        path: f.path,
        language: f.language,
        score: Math.round(score),
        centrality: f.centrality,
        riskLevel: f.riskLevel,
        summary: f.summary,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    setTaskResult(scored.slice(0, 6));
  };

  return (
    <div className="cg-container">
      {/* HEADER */}
      <div className="cg-header">
        <div className="cg-title-area">
          <span className="cg-title">⬡ Code Graph & Blast Radius Intelligence</span>
          <span className="cg-badge">MCP Tool Ready</span>
        </div>
        <div className="cg-tabs">
          <button
            className={`cg-tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            🕸️ Visual Graph
          </button>
          <button
            className={`cg-tab-btn ${activeTab === 'blast' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('blast');
              if (!blastResult) runBlastQuery();
            }}
          >
            💥 Blast Radius
          </button>
          <button
            className={`cg-tab-btn ${activeTab === 'symbols' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('symbols');
              if (!symbolResult) runSymbolQuery();
            }}
          >
            🔍 Symbol Inflows
          </button>
          <button
            className={`cg-tab-btn ${activeTab === 'task' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('task');
              if (!taskResult) runTaskQuery();
            }}
          >
            🤖 Task Relevance
          </button>
          <button
            className={`cg-tab-btn ${activeTab === 'arch' ? 'active' : ''}`}
            onClick={() => setActiveTab('arch')}
          >
            🏛️ Architecture Hubs
          </button>
          <button
            className={`cg-tab-btn ${activeTab === 'git' ? 'active' : ''}`}
            onClick={() => setActiveTab('git')}
          >
            🗂️ Git History
          </button>
          <button
            className={`cg-tab-btn ${activeTab === 'deps' ? 'active' : ''}`}
            onClick={() => setActiveTab('deps')}
          >
            📦 Dependencies
          </button>
        </div>
      </div>

      <div className="cg-body">
        {loading && <p style={{ color: '#64748b' }}>Loading codebase graph intelligence...</p>}

        {/* TAB 1: VISUAL GRAPH */}
        {activeTab === 'graph' && (
          <div className="cg-graph-layout">
            <div className="cg-canvas-wrapper">
              <div className="cg-graph-toolbar">
                <button
                  className={`cg-tool-btn ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  All Nodes
                </button>
                <button
                  className={`cg-tool-btn ${filterMode === 'files' ? 'active' : ''}`}
                  onClick={() => setFilterMode('files')}
                >
                  Files Only
                </button>
                <button
                  className={`cg-tool-btn ${filterMode === 'hotspots' ? 'active' : ''}`}
                  onClick={() => setFilterMode('hotspots')}
                >
                  Blast Hotspots
                </button>
                <SearchBar query={searchTerm} setQuery={setSearchTerm} />
              </div>

              <canvas ref={canvasRef} width={800} height={540} className="cg-canvas" />

              <div className="cg-legend">
                <div className="cg-legend-item">
                  <span className="cg-legend-dot" style={{ background: '#3b82f6' }} /> Low Risk
                </div>
                <div className="cg-legend-item">
                  <span className="cg-legend-dot" style={{ background: '#f59e0b' }} /> Medium Risk
                </div>
                <div className="cg-legend-item">
                  <span className="cg-legend-dot" style={{ background: '#ef4444' }} /> High / Critical
                </div>
              </div>
            </div>

            {/* SIDE PANEL */}
            <div className="cg-side-panel">
              {selectedNode ? (
                <>
                  <div>
                    <span className={`cg-tag ${selectedNode.riskLevel || 'LOW'}`}>
                      {selectedNode.riskLevel || 'LOW'} RISK
                    </span>
                    <h3 className="cg-panel-title">{selectedNode.name}</h3>
                    <div className="cg-panel-subtitle">{selectedNode.path || selectedNode.file}</div>
                  </div>

                  <div className="cg-stats-row">
                    <div className="cg-stat-card">
                      <div className="cg-stat-val">{selectedNode.centrality || 0}</div>
                      <div className="cg-stat-lbl">PageRank</div>
                    </div>
                    <div className="cg-stat-card">
                      <div className="cg-stat-val">{selectedNode.blastRadiusCount || 0}</div>
                      <div className="cg-stat-lbl">Blast Radius</div>
                    </div>
                    <div className="cg-stat-card">
                      <div className="cg-stat-val">{selectedNode.linesOfCode || '-'}</div>
                      <div className="cg-stat-lbl">Lines</div>
                    </div>
                  </div>

                  <div>
                    <div className="cg-stat-lbl" style={{ marginBottom: '4px' }}>
                      Role & Summary
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
                      {selectedNode.summary || selectedNode.signature || 'No summary'}
                    </p>
                  </div>

                  {selectedNode.symbols && selectedNode.symbols.length > 0 && (
                    <div>
                      <div className="cg-stat-lbl" style={{ marginBottom: '6px' }}>
                        Contained Symbols ({selectedNode.symbols.length})
                      </div>
                      <div className="cg-list">
                        {selectedNode.symbols.slice(0, 8).map((symId, idx) => (
                          <div key={idx} className="cg-list-item">
                            {symId.split(':').pop()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Click on any node in the graph to inspect its blast radius and symbol definitions.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BLAST RADIUS */}
        {activeTab === 'blast' && (
          <div className="cg-query-box">
            <h4>💥 Blast Radius & Break Risk Analysis</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Understand what files, models, and controllers will be impacted before modifying a symbol or file.
            </p>
            <div className="cg-input-row">
              <input
                className="cg-input"
                type="text"
                value={blastQuery}
                onChange={(e) => setBlastQuery(e.target.value)}
                placeholder="Enter symbol or file name (e.g., RepoJob, createJob, App)..."
              />
              <button className="cg-btn-primary" onClick={runBlastQuery}>
                Analyze Impact
              </button>
            </div>

            {blastResult && blastResult.found && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`cg-tag ${blastResult.riskLevel}`}>{blastResult.riskLevel} RISK</span>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>{blastResult.target}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({blastResult.file})</span>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>
                  {blastResult.recommendation}
                </p>

                <div>
                  <strong>Direct & Transitive Dependent Files ({blastResult.totalAffected}):</strong>
                  <div className="cg-list" style={{ marginTop: '6px' }}>
                    {blastResult.affectedFiles.map((f, i) => (
                      <div key={i} className="cg-list-item">
                        📄 {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYMBOL USAGES & CALL FLOWS */}
        {activeTab === 'symbols' && (
          <div className="cg-query-box">
            <h4>🔍 Symbol Usages & Call Inflows</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Locate where functions, classes, and components are defined and who calls them across the codebase.
            </p>
            <div className="cg-input-row">
              <input
                className="cg-input"
                type="text"
                value={symbolQuery}
                onChange={(e) => setSymbolQuery(e.target.value)}
                placeholder="Enter symbol name (e.g., createJob, RepoJobService)..."
              />
              <button className="cg-btn-primary" onClick={runSymbolQuery}>
                Find Usages
              </button>
            </div>

            {symbolResult && (
              <table className="cg-results-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Defined In</th>
                    <th>Line</th>
                    <th>Signature</th>
                    <th>Callers</th>
                  </tr>
                </thead>
                <tbody>
                  {symbolResult.map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{s.name}</td>
                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>{s.file}</td>
                      <td>{s.line}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.signature}</td>
                      <td>
                        {s.callers && s.callers.length > 0
                          ? s.callers.join(', ')
                          : 'None (Root / Unreferenced)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 4: TASK RELEVANCE RANKING */}
        {activeTab === 'task' && (
          <div className="cg-query-box">
            <h4>🤖 AI Task Relevance & Targeted Context</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Given a prompt or bug description, ranks the top files to look at without reading the whole repo.
            </p>
            <div className="cg-input-row">
              <input
                className="cg-input"
                type="text"
                value={taskQuery}
                onChange={(e) => setTaskQuery(e.target.value)}
                placeholder="Describe your task (e.g., fix token expiration error, update analysis metrics)..."
              />
              <button className="cg-btn-primary" onClick={runTaskQuery}>
                Rank Files
              </button>
            </div>

            {taskResult && (
              <table className="cg-results-table">
                <thead>
                  <tr>
                    <th>File Path</th>
                    <th>Lang</th>
                    <th>Relevance</th>
                    <th>PageRank</th>
                    <th>Risk</th>
                    <th>Module Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {taskResult.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{r.path}</td>
                      <td>{r.language}</td>
                      <td style={{ color: '#2563eb', fontWeight: '700' }}>{r.score} pts</td>
                      <td>{r.centrality}</td>
                      <td>
                        <span className={`cg-tag ${r.riskLevel}`}>{r.riskLevel}</span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>{r.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 5: ARCHITECTURE HUBS */}
        {activeTab === 'arch' && (
          <div className="cg-query-box">
            <h4>🏛️ Architectural Hubs & Central Hotspots</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Core backbone files calculated via PageRank and Dependency Centrality.
            </p>
            <table className="cg-results-table">
              <thead>
                <tr>
                  <th>Hub File</th>
                  <th>Language</th>
                  <th>PageRank</th>
                  <th>Blast Radius</th>
                  <th>Risk Rating</th>
                  <th>Architectural Role</th>
                </tr>
              </thead>
              <tbody>
                {[...(graphData?.nodes || [])]
                  .filter((n) => n.kind === 'file')
                  .sort((a, b) => (b.centrality || 0) - (a.centrality || 0))
                  .slice(0, 8)
                  .map((f, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '600', fontFamily: 'monospace' }}>{f.path}</td>
                      <td>{f.language}</td>
                      <td style={{ fontWeight: '700', color: '#2563eb' }}>{f.centrality}</td>
                      <td>{f.blastRadiusCount} files</td>
                      <td>
                        <span className={`cg-tag ${f.riskLevel}`}>{f.riskLevel}</span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>{f.summary}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {/* TAB 6: GIT HISTORY */}
        {activeTab === 'git' && (
          <div className="cg-query-box">
            <GitViewer />
          </div>
        )}
        {/* TAB 7: DEPENDENCIES */}
        {activeTab === 'deps' && (
          <div className="cg-query-box">
            <DependencyViewer />
          </div>
        )}
      </div>
    </div>
  );
}

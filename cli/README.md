# ⬡ Graphify Code Graph CLI & MCP Server

A fast, lightweight, multi-language codebase knowledge graph and Model Context Protocol (MCP) server.

Analyze a repository once into a local cached graph, then enable AI agents (Claude Code, Cursor, Windsurf, etc.) to understand symbol references, call inflows, blast radius, and task-relevant files **in milliseconds using minimal tokens** without rereading entire files.

---

## 🌟 Key Features

- **Multi-Language Support**:
  - JavaScript (`.js`, `.mjs`, `.cjs`)
  - TypeScript (`.ts`, `.mts`, `.cts`)
  - React & Next.js (`.jsx`, `.tsx`, routes, components, hooks)
  - Python (`.py`)
  - Java (`.java`)
  - Go (`.go`)
  - Rust (`.rs`)
- **Fast One-Time Scan & Cache**: Builds nodes, edges, symbol definitions, calls, and imports into `.graphify/graph.json` in under a tenth of a second for typical codebases.
- **Architectural PageRank Centrality**: Ranks every file and symbol by architectural importance (0–100).
- **Transitive Blast Radius**: Computes what files and symbols might break if a symbol or file is changed, along with a risk rating (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Targeted Relevant Files for AI Tasks**: Given a prompt (e.g., *"fix token expiration in worker"*), scores and returns only the 5–6 critical files and symbols to look at—saving thousands of tokens.
- **Zero API Key Requirement**: Works 100% locally and offline without external API keys or token costs.
- **Model Context Protocol (MCP) Server**: Plugs directly into Claude Code, Cursor, Windsurf, or custom agents over standard `stdio`.
- **Interactive Browser Visualization**: Launch a visual force-directed graph with `view` mode to inspect dependencies, search nodes, and highlight blast radius.

---

## 🚀 CLI Usage

From the project root:

```bash
# 1. Scan codebase and generate code graph
node cli/bin/graphify-code.js scan

# 2. Find where a symbol is defined, exported, imported, and called
node cli/bin/graphify-code.js usages RepoJobService

# 3. Trace what calls flow into a symbol (inflows)
node cli/bin/graphify-code.js callers createJob

# 4. Check what might break if you change a symbol or file (Blast Radius)
node cli/bin/graphify-code.js blast-radius RepoJob

# 5. Get top relevant files for an AI task or prompt
node cli/bin/graphify-code.js relevant-files "fix analysis error and poll job status"

# 6. View architecture overview & hotspots
node cli/bin/graphify-code.js summary

# 7. Launch interactive browser graph visualization
node cli/bin/graphify-code.js view --port 4000
```

---

## 🤖 MCP Configuration (Claude Code, Cursor, Windsurf)

Run the tool as an MCP server:

```bash
node cli/bin/graphify-code.js mcp
```

### 1. Claude Code
Add to your Claude Code configuration:

```bash
claude mcp add graphify-code -- node "D:/github/AIRepositoryAnalyzer/cli/bin/graphify-code.js" mcp
```

### 2. Cursor IDE (`.cursor/mcp.json`)
Create or update `.cursor/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "graphify-code": {
      "command": "node",
      "args": [
        "D:/github/AIRepositoryAnalyzer/cli/bin/graphify-code.js",
        "mcp"
      ]
    }
  }
}
```

### 3. Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "graphify-code": {
      "command": "node",
      "args": [
        "D:/github/AIRepositoryAnalyzer/cli/bin/graphify-code.js",
        "mcp"
      ]
    }
  }
}
```

---

## 🛠️ MCP Tools Exposed to AI Agents

| Tool Name | Purpose |
| :--- | :--- |
| `graphify_find_relevant_context` | Finds the most relevant files & symbols for a prompt without rereading every file. |
| `graphify_blast_radius` | Computes transitive dependents, impact depth, and break risk rating for a symbol or file. |
| `graphify_search_symbols` | Searches for functions, classes, components, endpoints, and types. |
| `graphify_get_symbol_info` | Retrieves declaration line, signature, export status, and direct callers. |
| `graphify_call_hierarchy` | Traces incoming callers (`incoming`) or outgoing callees (`outgoing`). |
| `graphify_get_architecture_summary` | Returns top central hub files (PageRank), entry points, and blast hotspots. |
| `graphify_inspect_file` | Summarizes a file's purpose, exports, imports, and dependent count. |

---

## 🌐 Browser Graph Viewer

Run:

```bash
node cli/bin/graphify-code.js view --port 4000
```

Open **`http://localhost:4000`** in your browser to:
- Visually explore your codebase's component & service dependencies.
- Filter by **All Nodes**, **Files Only**, or **Blast Hotspots**.
- Click any node to see its **PageRank Centrality**, **Blast Radius**, lines of code, and callers.
- Search any symbol or file with live zoom & highlight.

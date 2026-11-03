import React, { useEffect, useState } from "react";
import axios from "axios";

export default function GitViewer() {
  const [commits, setCommits] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [blame, setBlame] = useState([]);
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

  // Load recent commits on mount
  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/git/commits`);
        setCommits(res.data || []);
      } catch (e) {
        setError("Failed to fetch commits");
      }
    };
    fetchCommits();
  }, []);

  const loadBlame = async (path) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/git/blame`, { params: { path } });
      setBlame(res.data || []);
    } catch (e) {
      setError("Failed to fetch blame info");
    }
  };

  return (
    <div className="git-viewer">
      <h3>Recent Commits</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul className="commit-list" style={{ maxHeight: "200px", overflowY: "auto" }}>
        {commits.map((c) => (
          <li key={c.hash} style={{ marginBottom: "6px" }}>
            <strong>{c.shortHash}</strong> – {c.message} ({c.author})
          </li>
        ))}
      </ul>

      <h4>Blame a File</h4>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input
          type="text"
          placeholder="Relative file path (e.g., src/main/java/com/graphify/GraphifyApplication.java)"
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          style={{ flex: 1, padding: "4px 8px" }}
        />
        <button onClick={() => loadBlame(selectedFile)} style={{ padding: "4px 12px" }}>
          Load Blame
        </button>
      </div>
      {blame.length > 0 && (
        <table className="blame-table" style={{ width: "100%", fontSize: "0.85rem" }}>
          <thead>
            <tr>
              <th>Line</th>
              <th>Author</th>
              <th>Commit</th>
            </tr>
          </thead>
          <tbody>
            {blame.map((b) => (
              <tr key={b.line}>
                <td>{b.line}</td>
                <td>{b.author}</td>
                <td>{b.commit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


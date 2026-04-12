import { useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [jobId, setJobId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!repoUrl) return alert("Please enter a GitHub repo URL");

    setLoading(true);
    const res = await axios.post(
      "http://localhost:8080/repo/analyze?repoUrl=" + repoUrl
    );
    setJobId(res.data.id);
    setLoading(false);
  };

  const checkStatus = async () => {
    const res = await axios.get(
      "http://localhost:8080/repo/status/" + jobId
    );
    setData(res.data);
  };

  const parsed = data?.analysisResult ?? null;

  const languageData =
    parsed?.codebase?.languages
      ? Object.entries(parsed.codebase.languages).map(([key, value]) => ({
          name: key,
          value: value,
        }))
      : [];

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <h1 style={styles.title}>🚀 Graphify AI Dashboard</h1>
      <p style={styles.subtitle}>
        Paste a GitHub repository URL to analyze structure, codebase & insights
      </p>

      {/* INPUT CARD */}
      <div style={styles.card}>
        <input
          style={styles.input}
          placeholder="https://github.com/user/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />

        <button style={styles.button} onClick={handleAnalyze}>
          {loading ? "Analyzing..." : "Analyze Repository"}
        </button>
      </div>

      {/* JOB STATUS */}
      {jobId && (
        <div style={styles.card}>
          <p>🆔 Job ID: {jobId}</p>
          <button style={styles.secondaryButton} onClick={checkStatus}>
            Check Status
          </button>
        </div>
      )}

      {/* RESULTS */}
      {data && (
        <div style={styles.card}>
          <h3>Status: {data.status}</h3>

          {parsed && (
            <pre style={styles.jsonBox}>
              {JSON.stringify(parsed, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* CHART */}
      {languageData.length > 0 && (
        <div style={styles.card}>
          <h3>📊 Language Distribution</h3>
          <PieChart width={350} height={300}>
            <Pie
              data={languageData}
              dataKey="value"
              nameKey="name"
              outerRadius={120}
            >
              {languageData.map((_, index) => (
                <Cell key={index} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>
      )}

      {/* AI SUMMARY */}
      {parsed?.insights?.aiSummary && (
        <div style={styles.aiBox}>
          <h3>🤖 AI Summary</h3>
          <p>{parsed.insights.aiSummary}</p>
        </div>
      )}
    </div>
  );
}

export default App;

/* ---------------- STYLES ---------------- */

const styles = {
  page: {
    fontFamily: "Arial",
    padding: "30px",
    maxWidth: "900px",
    margin: "auto",
    background: "#f6f7fb",
    minHeight: "100vh",
  },

  title: {
    fontSize: "32px",
    marginBottom: "5px",
  },

  subtitle: {
    color: "gray",
    marginBottom: "20px",
  },

  card: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "15px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  input: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginBottom: "10px",
  },

  button: {
    padding: "10px 15px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },

  secondaryButton: {
    padding: "8px 12px",
    background: "#e5e7eb",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  jsonBox: {
    background: "#111",
    color: "#0f0",
    padding: "10px",
    borderRadius: "8px",
    overflowX: "auto",
    fontSize: "12px",
  },

  aiBox: {
    background: "#eef2ff",
    padding: "20px",
    borderRadius: "12px",
    marginTop: "10px",
  },
};
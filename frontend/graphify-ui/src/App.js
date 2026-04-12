import { useState, useEffect } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
import CountUp from "react-countup";
import HeatMap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [jobId, setJobId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeRepo = async () => {
    if (!repoUrl) return alert("Enter repo URL");

    setLoading(true);
    setData(null);

    try {
      const res = await axios.post(
        "http://localhost:8080/repo/analyze?repoUrl=" + repoUrl
      );
      setJobId(res.data.id);
    } catch (e) {
      alert("Backend error");
    }

    setLoading(false);
  };

  // polling
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const res = await axios.get(
        "http://localhost:8080/repo/status/" + jobId
      );
      setData(res.data);

      if (["SUCCESS", "FAILED"].includes(res.data.status)) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  const repo =
    typeof data?.analysisResult === "string"
      ? JSON.parse(data.analysisResult)
      : data?.analysisResult || {};

  const contributors = repo?.contributors || {};

  const languageData = repo?.codebase?.languages
    ? Object.entries(repo.codebase.languages).map(([k, v]) => ({
        name: k,
        value: Number(v) || 1,
      }))
    : [];

  const progress = () => {
    if (data?.status === "PENDING") return 25;
    if (data?.status === "PROCESSING") return 65;
    if (data?.status === "SUCCESS") return 100;
    if (data?.status === "FAILED") return 100;
    return 0;
  };

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        <h1>Graphify AI</h1>
        <p>GitHub repository intelligence dashboard</p>

        <div className="inputBox">
          <input
            placeholder="Paste GitHub repo URL..."
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <button onClick={analyzeRepo}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* SKELETON */}
      {loading && (
        <div className="grid">
          {[1, 2, 3, 4].map((i) => (
            <div className="skeleton card" key={i}></div>
          ))}
        </div>
      )}

      {/* PROGRESS */}
      {data && (
        <div className="card glass progressCard">
          <div className="progressBar">
            <div
              className="progressFill"
              style={{ width: `${progress()}%` }}
            />
          </div>
          <p>Status: {data.status}</p>
        </div>
      )}

      {/* METRICS */}
      <div className="grid">
        <div className="card">
          ⭐ <h2><CountUp end={repo.stars ?? 0} duration={1.2} /></h2>
        </div>

        <div className="card">
          🍴 <h2><CountUp end={repo.forks ?? 0} duration={1.2} /></h2>
        </div>

        <div className="card">
          👨‍💻 <h2><CountUp end={contributors.totalContributors ?? 0} duration={1.2} /></h2>
        </div>

        <div className="card">
          📦 <h2><CountUp end={repo.size ?? 0} duration={1.2} /></h2>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid2">

        {/* CHART */}
        {languageData.length > 0 && (
          <div className="card glass chartBox">
            <h3>Language Distribution</h3>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={languageData} dataKey="value" outerRadius={90}>
                  {languageData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${i * 70},70%,60%)`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CONTRIBUTOR PANEL */}
        <div className="card glass aiPanel">
          <h3>Contributor Intelligence</h3>

          <div className="aiGrid">
            <div>
              <p>Bus Factor</p>
              <h2>{contributors.busFactor ?? "N/A"}</h2>
            </div>

            <div>
              <p>Total Contributors</p>
              <h2>{contributors.totalContributors ?? "N/A"}</h2>
            </div>

            <div>
              <p>Top Contributor</p>
              <h2>{contributors.topContributor ?? "N/A"}</h2>
            </div>
          </div>
        </div>
      </div>
        <div className="card heatmapCard">
          <h3>📅 Contribution Activity</h3>

          <HeatMap
            startDate={new Date("2024-01-01")}
            endDate={new Date()}
            values={[
              { date: "2024-01-01", count: 1 },
              { date: "2024-01-03", count: 3 },
              { date: "2024-01-07", count: 5 },
            ]}
            classForValue={(value) => {
              if (!value) return "color-empty";
              if (value.count > 4) return "color-github-4";
              if (value.count > 2) return "color-github-3";
              if (value.count > 0) return "color-github-2";
              return "color-github-1";
            }}
          />
        </div>

      {/* AI REPORT */}
      {repo?.ai_summary && (
        <div className="card aiReportCard">

          <div className="aiHeader">
            🤖 AI Code Intelligence Report
          </div>

          <div className="aiScore">
            <span>Score</span>
            <h1>{repo.ai_summary?.score ?? 0}/100</h1>
          </div>

          <div className="aiBadge">
            {repo.ai_summary?.health_status === "GOOD"
              ? "🟢 Healthy Codebase"
              : "🟡 Needs Improvement"}
          </div>

          <div className="aiGrid">
            <div className="aiBox green">
              <h4>Strengths</h4>
              <ul>
                {repo.ai_summary?.strengths?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="aiBox yellow">
              <h4>Improvements</h4>
              <ul>
                {repo.ai_summary?.areas_for_improvement?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
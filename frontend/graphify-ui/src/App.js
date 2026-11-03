import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import Header from "./components/Header";
import RepoInput from "./components/RepoInput";
import LoadingState from "./components/LoadingState";
import ProgressCard from "./components/ProgressCard";
import MetricsGrid from "./components/MetricsGrid";
import LanguageChart from "./components/LanguageChart";
import ContributorPanel from "./components/ContributorPanel";
import CommitHeatmap from "./components/CommitHeatmap";
import AIReport from "./components/AIReport";
import EmptyState from "./components/EmptyState";
import CodeGraphViewer from "./components/CodeGraphViewer";

// Get API base URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

export default function App() {
  const [viewTab, setViewTab] = useState("overview"); // overview | codegraph
  const [repoUrl, setRepoUrl] = useState("");
  const [jobId, setJobId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  const validateGitHubUrl = (url) => {
    if (!url) return "Please enter a GitHub repository URL";
    const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    if (!githubUrlPattern.test(url)) {
      return "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)";
    }
    return null;
  };

  const analyzeRepo = async () => {
    const validationError = validateGitHubUrl(repoUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    setData(null);
    setJobId(null);

    // Clear any existing polling interval
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    try {
      const formattedUrl = repoUrl.endsWith("/")
        ? repoUrl.slice(0, -1)
        : repoUrl;

      const res = await axios.post(
        `${API_BASE_URL}/analyze`,
        { repoUrl: formattedUrl }
      );

      if (res.data && res.data.id) {
        setJobId(res.data.id);
        setData(res.data);
        if (res.data.status !== "COMPLETED" && res.data.status !== "FAILED") {
          startPolling(res.data.id);
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (e) {
      console.error("Analysis error:", e);
      setError(e.response?.data?.message || "Failed to start analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (id) => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/analyze/${id}`);
        if (res.data) {
          setData(res.data);

          // Stop polling when job is complete or failed
          if (["COMPLETED", "FAILED"].includes(res.data.status)) {
            clearInterval(interval);
            setPollInterval(null);
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
        setError("Failed to check job status. Please try refreshing.");
        clearInterval(interval);
        setPollInterval(null);
      }
    }, 2000); // Poll every 2 seconds

    setPollInterval(interval);
  };

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Reset form when starting a new analysis
  useEffect(() => {
    if (loading) {
      setError(null);
    }
  }, [loading]);

  let repo = {};
  try {
    if (typeof data?.analysisResult === "string" && data.analysisResult.trim().length > 0) {
      repo = JSON.parse(data.analysisResult);
    } else if (typeof data?.analysisResult === "object" && data?.analysisResult !== null) {
      repo = data.analysisResult;
    }
  } catch (err) {
    console.error("Failed to parse analysisResult:", err);
    repo = {};
  }

  const contributors = repo?.contributors || {};

  const languageData = repo?.codebase?.languages
    ? Object.entries(repo.codebase.languages).map(([k, v]) => ({
        name: k,
        value: Number(v) || 1,
      }))
    : [];

  return (
    <div className="app">
      {/* HEADER */}
      <Header />

      {/* ERROR MESSAGE */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* VIEW SELECTOR */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '18px 0' }}>
        <button
          onClick={() => setViewTab('overview')}
          style={{
            background: viewTab === 'overview' ? '#2563eb' : '#ffffff',
            color: viewTab === 'overview' ? '#ffffff' : '#475569',
            border: '1px solid #cbd5e1',
            padding: '8px 20px',
            borderRadius: '20px',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s',
          }}
        >
          📊 Repository Overview & Metrics
        </button>
        <button
          onClick={() => setViewTab('codegraph')}
          style={{
            background: viewTab === 'codegraph' ? '#2563eb' : '#ffffff',
            color: viewTab === 'codegraph' ? '#ffffff' : '#475569',
            border: '1px solid #cbd5e1',
            padding: '8px 20px',
            borderRadius: '20px',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s',
          }}
        >
          🕸️ Code Graph & Blast Radius (MCP)
        </button>
      </div>

      {viewTab === 'codegraph' ? (
        <CodeGraphViewer />
      ) : (
        <>
          {/* INPUT SECTION */}
          <RepoInput
            onAnalyze={analyzeRepo}
            onInputChange={(e) => setRepoUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && analyzeRepo()}
            repoUrl={repoUrl}
            loading={loading}
          />

          {/* LOADING STATE */}
          <LoadingState loading={loading} jobId={jobId} />

          {/* PROGRESS CARD */}
          <ProgressCard jobId={jobId} data={data} />

          {/* METRICS - ONLY SHOW WHEN WE HAVE DATA */}
          <MetricsGrid data={data} />

          {/* DASHBOARD GRID - ONLY SHOW WHEN WE HAVE DATA */}
          {data && data.status === "COMPLETED" && (
            <>
              <div className="grid2 dashboard-grid">
                {/* LANGUAGE CHART */}
                <LanguageChart languageData={languageData} />

                {/* CONTRIBUTOR PANEL */}
                <ContributorPanel contributors={contributors} />

                {/* COMMIT ACTIVITY HEATMAP */}
                <CommitHeatmap contributors={contributors} />

                {/* AI REPORT - ONLY SHOW WHEN WE HAVE AI SUMMARY */}
                <AIReport repo={repo} />
              </div>

              {/* CODE GRAPH DIRECTLY IN DASHBOARD */}
              <CodeGraphViewer />
            </>
          )}

          {/* EMPTY STATE - SHOW WHEN NO DATA YET */}
          <EmptyState data={data} loading={loading} />
        </>
      )}
    </div>
  );
}
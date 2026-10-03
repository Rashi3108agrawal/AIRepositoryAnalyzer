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

// Get API base URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

export default function App() {
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
        // Start polling for job status
        startPolling();
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

  const startPolling = () => {
    setPollInterval(
      setInterval(async () => {
        if (!jobId) return;

        try {
          const res = await axios.get(`${API_BASE_URL}/analyze/${jobId}`);
          setData(res.data);

          // Stop polling when job is complete or failed
          if (res.data && ["COMPLETED", "FAILED"].includes(res.data.status)) {
            clearInterval(pollInterval);
            setPollInterval(null);
          }
        } catch (e) {
          console.error("Polling error:", e);
          setError("Failed to check job status. Please try refreshing.");
          // Stop polling on persistent errors
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      }, 2000) // Poll every 2 seconds
    );
  };

  // Clean up polling interval on unmount or when jobId changes
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId, pollInterval]);

  // Reset form when starting a new analysis
  useEffect(() => {
    if (loading) {
      setError(null);
    }
  }, [loading]);

  const repo = typeof data?.analysisResult === "string"
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
    if (!data) return 0;
    if (data.status === "PENDING") return 25;
    if (data.status === "PROCESSING") return 65;
    if (data.status === "COMPLETED") return 100;
    if (data.status === "FAILED") return 100;
    return 0;
  };

  const getStatusMessage = () => {
    if (!data) return "";
    switch (data.status) {
      case "PENDING":
        return "Job is queued and waiting to be processed";
      case "PROCESSING":
        return "Analyzing repository and generating insights";
      case "COMPLETED":
        return "Analysis completed successfully";
      case "FAILED":
        return `Analysis failed: ${data.errorMessage || "Unknown error"}`;
      default:
        return "";
    }
  };

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
      )}

      {/* EMPTY STATE - SHOW WHEN NO DATA YET */}
      <EmptyState data={data} loading={loading} />
    </div>
  );
}
import React from 'react';
import CountUp from 'react-countup';
import './MetricsGrid.css';

const MetricsGrid = ({ data }) => {
  if (!data || data.status !== "COMPLETED") return null;

  const repo = typeof data?.analysisResult === "string"
    ? JSON.parse(data.analysisResult)
    : data?.analysisResult || {};

  const contributors = repo?.contributors || {};

  return (
    <div className="grid metrics-grid">
      <div className="card">
        <div className="metric-label">⭐ Stars</div>
        <div className="metric-value">
          <CountUp end={repo.stars ?? 0} duration={1.2} />
        </div>
      </div>

      <div className="card">
        <div className="metric-label">🍴 Forks</div>
        <div className="metric-value">
          <CountUp end={repo.forks ?? 0} duration={1.2} />
        </div>
      </div>

      <div className="card">
        <div className="metric-label">👨‍💻 Contributors</div>
        <div className="metric-value">
          <CountUp end={contributors.totalContributors ?? 0} duration={1.2} />
        </div>
      </div>

      <div className="card">
        <div className="metric-label">📦 Size (KB)</div>
        <div className="metric-value">
          <CountUp end={repo.size ?? 0} duration={1.2} />
        </div>
      </div>
    </div>
  );
};

export default MetricsGrid;
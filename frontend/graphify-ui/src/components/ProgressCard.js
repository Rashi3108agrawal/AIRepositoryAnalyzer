import React from 'react';
import './ProgressCard.css';

const ProgressCard = ({ jobId, data }) => {
  if (!jobId) return null;

  const repo = typeof data?.analysisResult === "string"
    ? JSON.parse(data.analysisResult)
    : data?.analysisResult || {};

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
    <div className="card glass progressCard">
      <div className="progressBar">
        <div
          className="progressFill"
          style={{ width: `${progress()}%` }}
        />
      </div>
      <p>Status: {data?.status || "PENDING"}</p>
      {getStatusMessage() && <p className="status-message">{getStatusMessage()}</p>}
    </div>
  );
};

export default ProgressCard;
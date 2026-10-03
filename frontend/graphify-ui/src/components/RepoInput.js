import React from 'react';
import './RepoInput.css';

const RepoInput = ({ onAnalyze, onInputChange, onKeyPress, repoUrl, loading }) => {
  return (
    <div className="inputBox">
      <input
        className="repoInput"
        placeholder="Paste GitHub repo URL..."
        value={repoUrl}
        onChange={onInputChange}
        onKeyPress={onKeyPress}
      />
      <button
        className="analyzeButton"
        onClick={onAnalyze}
        disabled={loading}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  );
};

export default RepoInput;
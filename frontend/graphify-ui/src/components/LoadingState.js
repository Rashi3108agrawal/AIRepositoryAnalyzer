import React from 'react';
import './LoadingState.css';

const LoadingState = ({ loading, jobId }) => {
  if (!loading || jobId) return null;

  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Starting analysis...</p>
    </div>
  );
};

export default LoadingState;